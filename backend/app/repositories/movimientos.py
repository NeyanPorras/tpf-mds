"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class MovimientosRepository:
    """Consultas sobre `movimientos_stock` y el ajuste de `productos.stock`.

    Las llamadas de escritura de un ingreso corren dentro de la transacción
    que maneja el service (ver registrar_entrada): este repositorio no
    commitea nada por sí mismo.
    """

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def crear_entrada(
        self,
        producto_id: int,
        usuario_id: int,
        cantidad: int,
        observacion: str | None,
    ) -> int:
        """Registra un movimiento de ENTRADA y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO movimientos_stock "
                "(producto_id, usuario_id, tipo, cantidad, observacion) "
                "VALUES (%s, %s, 'ENTRADA', %s, %s)",
                (producto_id, usuario_id, cantidad, observacion),
            )
            return cursor.lastrowid

    async def sumar_stock(self, producto_id: int, cantidad: int) -> int:
        """Suma stock atómicamente y devuelve las filas afectadas."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE productos SET stock = stock + %s WHERE id = %s",
                (cantidad, producto_id),
            )
            return cursor.rowcount

    async def obtener_stock(self, producto_id: int) -> int:
        """Devuelve el stock actual del producto."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT stock FROM productos WHERE id = %s",
                (producto_id,),
            )
            return (await cursor.fetchone())[0]

    async def listar_por_producto(
        self, producto_id: int, limite: int, offset: int
    ) -> list[dict[str, Any]]:
        """Movimientos del producto con el usuario que lo registró."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT m.id, m.tipo, m.cantidad, m.fecha, m.pedido_id, "
                "u.id AS usuario_id, u.nombre AS usuario_nombre "
                "FROM movimientos_stock m JOIN usuarios u ON u.id = m.usuario_id "
                "WHERE m.producto_id = %s "
                "ORDER BY m.fecha DESC, m.id DESC LIMIT %s OFFSET %s",
                (producto_id, limite, offset),
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
        return [
            {
                "id": fila["id"],
                "tipo": fila["tipo"],
                "cantidad": fila["cantidad"],
                "fecha": fila["fecha"],
                "usuario": {
                    "id": fila["usuario_id"],
                    "nombre": fila["usuario_nombre"],
                },
                "pedido_id": fila["pedido_id"],
            }
            for fila in filas
        ]

    async def contar_por_producto(self, producto_id: int) -> int:
        """Cantidad de movimientos del producto (para paginar)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT COUNT(*) FROM movimientos_stock WHERE producto_id = %s",
                (producto_id,),
            )
            return (await cursor.fetchone())[0]
