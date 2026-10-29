"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class ProductosRepository:
    """Consultas sobre `productos` con su categoría y proveedor."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    @staticmethod
    def _condiciones(filtros: dict[str, Any]) -> tuple[str, list[Any]]:
        """Traduce los filtros de GET /productos a WHERE y parámetros."""
        condiciones: list[str] = []
        parametros: list[Any] = []
        if filtros.get("categoria_id"):
            condiciones.append("p.categoria_id = %s")
            parametros.append(filtros["categoria_id"])
        if filtros.get("proveedor_id"):
            condiciones.append("p.proveedor_id = %s")
            parametros.append(filtros["proveedor_id"])
        if filtros.get("buscar"):
            condiciones.append("(p.nombre LIKE %s OR p.presentacion LIKE %s)")
            texto = f"%{filtros['buscar']}%"
            parametros.extend([texto, texto])
        if filtros.get("bajo_minimo"):
            condiciones.append("p.stock <= p.stock_minimo")
        return (" AND ".join(condiciones) if condiciones else ""), parametros

    @staticmethod
    def _base_consulta() -> str:
        return (
            "SELECT p.id, p.nombre, p.presentacion, p.precio, p.stock, p.stock_minimo, "
            "c.id AS categoria_id, c.nombre AS categoria_nombre, "
            "v.id AS proveedor_id, v.razon_social AS proveedor_razon_social "
            "FROM productos p "
            "JOIN categorias c ON c.id = p.categoria_id "
            "JOIN proveedores v ON v.id = p.proveedor_id "
        )

    @staticmethod
    def _mapear(fila: dict[str, Any]) -> dict[str, Any]:
        """Separa la fila del JOIN en producto / diccionarios anidados."""
        return {
            "id": fila["id"],
            "nombre": fila["nombre"],
            "presentacion": fila["presentacion"],
            "precio": float(fila["precio"]),
            "stock": fila["stock"],
            "stock_minimo": fila["stock_minimo"],
            "categoria": {
                "id": fila["categoria_id"],
                "nombre": fila["categoria_nombre"],
            },
            "proveedor": {
                "id": fila["proveedor_id"],
                "razon_social": fila["proveedor_razon_social"],
            },
        }

    async def listar(
        self, filtros: dict[str, Any], limite: int, offset: int
    ) -> list[dict[str, Any]]:
        """Devuelve una página de productos ordenados por nombre."""
        condiciones, parametros = self._condiciones(filtros)
        consulta = self._base_consulta()
        if condiciones:
            consulta += "WHERE " + condiciones + " "
        consulta += "ORDER BY p.nombre LIMIT %s OFFSET %s"
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, (*parametros, limite, offset))
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return [self._mapear(fila) for fila in filas]

    async def contar(self, filtros: dict[str, Any]) -> int:
        """Cantidad de productos con los mismos filtros (para paginar)."""
        condiciones, parametros = self._condiciones(filtros)
        consulta = "SELECT COUNT(*) FROM productos p"
        if condiciones:
            consulta += " WHERE " + condiciones
        async with self.conexion.cursor() as cursor:
            await cursor.execute(consulta, parametros)
            return (await cursor.fetchone())[0]

    async def obtener_por_id(self, id_producto: int) -> dict[str, Any] | None:
        """Devuelve el producto con categoría y proveedor, o None."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                self._base_consulta() + "WHERE p.id = %s",
                (id_producto,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return self._mapear(fila) if fila else None

    async def contar_mismo_nombre(
        self, nombre: str, presentacion: str, excluyendo_id: int = 0
    ) -> int:
        """Duplicados por (nombre, presentacion): la base también es UNIQUE."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT COUNT(*) FROM productos "
                "WHERE nombre = %s AND presentacion = %s AND id <> %s",
                (nombre, presentacion, excluyendo_id),
            )
            return (await cursor.fetchone())[0]

    async def crear(
        self,
        nombre: str,
        presentacion: str,
        precio: str,
        stock_minimo: int,
        categoria_id: int,
        proveedor_id: int,
    ) -> int:
        """Inserta el producto con stock en 0 y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO productos "
                "(nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id) "
                "VALUES (%s, %s, %s, 0, %s, %s, %s)",
                (nombre, presentacion, precio, stock_minimo, categoria_id, proveedor_id),
            )
            return cursor.lastrowid

    async def actualizar(
        self,
        id_producto: int,
        nombre: str,
        presentacion: str,
        precio: str,
        stock_minimo: int,
        categoria_id: int,
        proveedor_id: int,
    ) -> None:
        """Actualiza datos del producto (el `stock` no se toca nunca acá)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE productos SET nombre = %s, presentacion = %s, precio = %s, "
                "stock_minimo = %s, categoria_id = %s, proveedor_id = %s "
                "WHERE id = %s",
                (nombre, presentacion, precio, stock_minimo, categoria_id, proveedor_id, id_producto),
            )

    async def eliminar(self, id_producto: int) -> None:
        """Borra el producto."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("DELETE FROM productos WHERE id = %s", (id_producto,))
