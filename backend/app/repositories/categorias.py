"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class CategoriasRepository:
    """Consultas sobre `categorias`."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def listar(self) -> list[dict[str, Any]]:
        """Devuelve todas las categorías ordenadas por nombre."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, nombre FROM categorias ORDER BY nombre"
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def obtener_por_id(self, id_categoria: int) -> dict[str, Any] | None:
        """Devuelve la categoría o None si no existe."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, nombre FROM categorias WHERE id = %s",
                (id_categoria,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def buscar_por_nombre(self, nombre: str) -> dict[str, Any] | None:
        """Devuelve la categoría con ese nombre (para detectar duplicados)."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, nombre FROM categorias WHERE nombre = %s",
                (nombre,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def crear(self, nombre: str) -> int:
        """Inserta la categoría y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO categorias (nombre) VALUES (%s)",
                (nombre,),
            )
            return cursor.lastrowid

    async def actualizar(self, id_categoria: int, nombre: str) -> None:
        """Renombra la categoría."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE categorias SET nombre = %s WHERE id = %s",
                (nombre, id_categoria),
            )

    async def contar_productos(self, id_categoria: int) -> int:
        """Cantidad de productos de la categoría (para impedir borrar)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT COUNT(*) FROM productos WHERE categoria_id = %s",
                (id_categoria,),
            )
            return (await cursor.fetchone())[0]

    async def eliminar(self, id_categoria: int) -> None:
        """Borra la categoría."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("DELETE FROM categorias WHERE id = %s", (id_categoria,))
