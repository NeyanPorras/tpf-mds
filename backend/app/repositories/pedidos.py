"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from datetime import datetime
from typing import Any

import aiomysql


class PedidosRepository:
    """Consultas sobre `pedidos`, sus líneas y el SP de confirmación."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    @staticmethod
    def _condiciones(filtros: dict[str, Any]) -> str:
        """Traduce los filtros de GET /pedidos a un WHERE."""
        condiciones: list[str] = []
        if filtros.get("estado"):
            condiciones.append("p.estado = %s")
        if filtros.get("cliente_id"):
            condiciones.append("p.cliente_id = %s")
        if filtros.get("desde"):
            condiciones.append("p.fecha >= %s")
        if filtros.get("hasta"):
            condiciones.append("p.fecha < %s")
        return " AND ".join(condiciones)

    @staticmethod
    def _parametros(filtros: dict[str, Any]) -> list[Any]:
        valores: list[Any] = []
        if filtros.get("estado"):
            valores.append(filtros["estado"])
        if filtros.get("cliente_id"):
            valores.append(filtros["cliente_id"])
        if filtros.get("desde"):
            valores.append(filtros["desde"])
        if filtros.get("hasta"):
            valores.append(filtros["hasta"])
        return valores

    async def listar(
        self, filtros: dict[str, Any], limite: int, offset: int
    ) -> list[dict[str, Any]]:
        """Cabecera de los pedidos de una página (sin líneas)."""
        condiciones = self._condiciones(filtros)
        consulta = (
            "SELECT p.id, p.fecha, p.estado, p.total, "
            "c.id AS cliente_id, c.razon_social AS cliente_razon_social, "
            "u.id AS vendedor_id, u.nombre AS vendedor_nombre "
            "FROM pedidos p "
            "JOIN clientes c ON c.id = p.cliente_id "
            "JOIN usuarios u ON u.id = p.usuario_id"
        )
        if condiciones:
            consulta += " WHERE " + condiciones
        consulta += " ORDER BY p.fecha DESC, p.id DESC LIMIT %s OFFSET %s"
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                consulta, (*self._parametros(filtros), limite, offset)
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def contar(self, filtros: dict[str, Any]) -> int:
        """Cantidad de pedidos con los mismos filtros (para paginar)."""
        condiciones = self._condiciones(filtros)
        consulta = "SELECT COUNT(*) FROM pedidos p"
        if condiciones:
            consulta += " WHERE " + condiciones
        async with self.conexion.cursor() as cursor:
            await cursor.execute(consulta, self._parametros(filtros))
            return (await cursor.fetchone())[0]

    async def obtener_cabecera(self, id_pedido: int) -> dict[str, Any] | None:
        """Cabecera del pedido con cliente y vendedor, o None si no existe."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT p.id, p.fecha, p.estado, p.total, "
                "c.id AS cliente_id, c.razon_social AS cliente_razon_social, "
                "u.id AS vendedor_id, u.nombre AS vendedor_nombre "
                "FROM pedidos p "
                "JOIN clientes c ON c.id = p.cliente_id "
                "JOIN usuarios u ON u.id = p.usuario_id "
                "WHERE p.id = %s",
                (id_pedido,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def listar_lineas(self, id_pedido: int) -> list[dict[str, Any]]:
        """Líneas del pedido con producto, precio y subtotal."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT d.id, d.cantidad, d.precio_unitario, "
                "d.cantidad * d.precio_unitario AS subtotal, "
                "po.id AS producto_id, po.nombre AS producto_nombre, "
                "po.presentacion AS producto_presentacion "
                "FROM detalle_pedido d JOIN productos po ON po.id = d.producto_id "
                "WHERE d.pedido_id = %s ORDER BY d.id",
                (id_pedido,),
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def obtener_estado(self, id_pedido: int) -> str | None:
        """Estado del pedido, o None si no existe."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT estado FROM pedidos WHERE id = %s", (id_pedido,)
            )
            fila: tuple[Any, ...] | None = await cursor.fetchone()
            return fila[0] if fila is not None else None

    async def obtener_precios(
        self, ids_productos: list[int]
    ) -> dict[int, dict[str, Any]]:
        """Precio, nombre y presentación de los productos pedidos."""
        placeholders = ", ".join("%s" for _ in ids_productos)
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                f"SELECT id, nombre, presentacion, precio FROM productos "
                f"WHERE id IN ({placeholders})",
                ids_productos,
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return {fila["id"]: fila for fila in filas}

    async def crear_cabecera(
        self, cliente_id: int, usuario_id: int, fecha: datetime
    ) -> int:
        """Crea el pedido en PENDIENTE y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total) "
                "VALUES (%s, %s, %s, 'PENDIENTE', 0)",
                (cliente_id, usuario_id, fecha),
            )
            return cursor.lastrowid

    async def crear_linea(
        self, id_pedido: int, producto_id: int, cantidad: int, precio: Any
    ) -> int:
        """Inserta una línea con el precio copiado del producto."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) "
                "VALUES (%s, %s, %s, %s)",
                (id_pedido, producto_id, cantidad, precio),
            )
            return cursor.lastrowid

    async def cambiar_estado(self, id_pedido: int, estado: str) -> None:
        """Pasa el pedido al estado indicado (solo transiciones válidas)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE pedidos SET estado = %s WHERE id = %s", (estado, id_pedido)
            )

    async def llamar_sp_confirmar(self, id_pedido: int, usuario_id: int) -> None:
        """Llama `sp_confirmar_pedido`: transacción completa en la base.

        El SP maneja sus propios commits, rollbacks y errores de negocio:
        a estos últimos los traduce el service (ver `confirmar`).
        """
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "CALL sp_confirmar_pedido(%s, %s)", (id_pedido, usuario_id)
            )
            # El SP devuelve SELECT id, estado, total: se consume para no
            # arrastrar el resultset pendiente con la conexión devuelta.
            await cursor.fetchall()

    async def obtener_faltante(self, id_pedido: int) -> dict[str, Any] | None:
        """Primera línea sin stock: producto, solicitado y disponible."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT d.producto_id, d.cantidad AS solicitado, po.stock AS disponible, "
                "CONCAT(po.nombre, ' ', po.presentacion) AS nombre "
                "FROM detalle_pedido d JOIN productos po ON po.id = d.producto_id "
                "WHERE d.pedido_id = %s AND d.cantidad > po.stock ORDER BY d.id LIMIT 1",
                (id_pedido,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila
