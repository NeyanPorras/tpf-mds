"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class ProveedoresRepository:
    """Consultas sobre `proveedores`."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def listar(self) -> list[dict[str, Any]]:
        """Devuelve todos los proveedores ordenados por razón social."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, razon_social, cuit, telefono, email "
                "FROM proveedores ORDER BY razon_social"
            )
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def obtener_por_id(self, id_proveedor: int) -> dict[str, Any] | None:
        """Devuelve el proveedor o None si no existe."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, razon_social, cuit, telefono, email "
                "FROM proveedores WHERE id = %s",
                (id_proveedor,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def buscar_por_cuit(self, cuit: str) -> dict[str, Any] | None:
        """Devuelve el proveedor con ese CUIT (para detectar duplicados)."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, razon_social, cuit, telefono, email "
                "FROM proveedores WHERE cuit = %s",
                (cuit,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def crear(
        self, razon_social: str, cuit: str, telefono: str | None, email: str | None
    ) -> int:
        """Inserta el proveedor y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO proveedores (razon_social, cuit, telefono, email) "
                "VALUES (%s, %s, %s, %s)",
                (razon_social, cuit, telefono, email),
            )
            return cursor.lastrowid

    async def actualizar(
        self,
        id_proveedor: int,
        razon_social: str,
        cuit: str,
        telefono: str | None,
        email: str | None,
    ) -> None:
        """Actualiza datos del proveedor (al menos uno distinto de None)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE proveedores SET razon_social = %s, cuit = %s, "
                "telefono = %s, email = %s WHERE id = %s",
                (razon_social, cuit, telefono, email, id_proveedor),
            )

    async def contar_productos(self, id_proveedor: int) -> int:
        """Cantidad de productos del proveedor (para impedir borrar)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT COUNT(*) FROM productos WHERE proveedor_id = %s",
                (id_proveedor,),
            )
            return (await cursor.fetchone())[0]

    async def eliminar(self, id_proveedor: int) -> None:
        """Borra el proveedor."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM proveedores WHERE id = %s", (id_proveedor,)
            )
