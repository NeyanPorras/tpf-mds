"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class ClientesRepository:
    """Consultas sobre `clientes`."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    @staticmethod
    def _condiciones(filtros: dict[str, Any]) -> tuple[str, list[Any]]:
        """Traduce los filtros de GET /clientes a WHERE y parámetros."""
        condiciones: list[str] = []
        parametros: list[Any] = []
        if filtros.get("zona"):
            condiciones.append("zona = %s")
            parametros.append(filtros["zona"])
        if filtros.get("buscar"):
            condiciones.append(
                "(razon_social LIKE %s OR cuit LIKE %s OR direccion LIKE %s)"
            )
            texto = f"%{filtros['buscar']}%"
            parametros.extend([texto, texto, texto])
        return (" AND ".join(condiciones) if condiciones else ""), parametros

    async def listar(
        self, filtros: dict[str, Any], limite: int, offset: int
    ) -> list[dict[str, Any]]:
        """Devuelve una página de clientes ordenados por razón social."""
        condiciones, parametros = self._condiciones(filtros)
        consulta = "SELECT id, razon_social, cuit, direccion, zona, telefono FROM clientes"
        if condiciones:
            consulta += " WHERE " + condiciones
        consulta += " ORDER BY razon_social LIMIT %s OFFSET %s"
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, (*parametros, limite, offset))
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def contar(self, filtros: dict[str, Any]) -> int:
        """Cantidad de clientes con los mismos filtros (para paginar)."""
        condiciones, parametros = self._condiciones(filtros)
        consulta = "SELECT COUNT(*) FROM clientes"
        if condiciones:
            consulta += " WHERE " + condiciones
        async with self.conexion.cursor() as cursor:
            await cursor.execute(consulta, parametros)
            return (await cursor.fetchone())[0]

    async def obtener_por_id(self, id_cliente: int) -> dict[str, Any] | None:
        """Devuelve el cliente o None si no existe."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, razon_social, cuit, direccion, zona, telefono "
                "FROM clientes WHERE id = %s",
                (id_cliente,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def buscar_por_cuit(self, cuit: str) -> dict[str, Any] | None:
        """Devuelve el cliente con ese CUIT (para detectar duplicados)."""
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, razon_social, cuit, direccion, zona, telefono "
                "FROM clientes WHERE cuit = %s",
                (cuit,),
            )
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def crear(
        self, razon_social: str, cuit: str, direccion: str, zona: str, telefono: str | None
    ) -> int:
        """Inserta el cliente y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO clientes (razon_social, cuit, direccion, zona, telefono) "
                "VALUES (%s, %s, %s, %s, %s)",
                (razon_social, cuit, direccion, zona, telefono),
            )
            return cursor.lastrowid

    async def actualizar(
        self,
        id_cliente: int,
        razon_social: str,
        cuit: str,
        direccion: str,
        zona: str,
        telefono: str | None,
    ) -> None:
        """Actualiza todos los datos del cliente."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE clientes SET razon_social = %s, cuit = %s, direccion = %s, "
                "zona = %s, telefono = %s WHERE id = %s",
                (razon_social, cuit, direccion, zona, telefono, id_cliente),
            )

    async def contar_pedidos(self, id_cliente: int) -> int:
        """Cantidad de pedidos del cliente (para traducir FK RESTRICT)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "SELECT COUNT(*) FROM pedidos WHERE cliente_id = %s",
                (id_cliente,),
            )
            return (await cursor.fetchone())[0]

    async def eliminar(self, id_cliente: int) -> None:
        """Borra el cliente (falla si tiene pedidos: FK RESTRICT)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("DELETE FROM clientes WHERE id = %s", (id_cliente,))
