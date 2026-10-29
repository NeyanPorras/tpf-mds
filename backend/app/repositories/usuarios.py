"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class UsuariosRepository:
    """Consultas sobre `usuarios` y su rol."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def buscar_por_email(self, email: str) -> dict[str, Any] | None:
        """Devuelve el usuario para validar la contraseña, o None si no existe."""
        consulta = (
            "SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.nombre AS rol "
            "FROM usuarios u JOIN roles r ON r.id = u.rol_id "
            "WHERE u.email = %s"
        )
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, (email,))
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila

    async def obtener_por_id(self, id_usuario: int) -> dict[str, Any] | None:
        """Devuelve el usuario con su rol, o None si no existe."""
        consulta = (
            "SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.nombre AS rol "
            "FROM usuarios u JOIN roles r ON r.id = u.rol_id "
            "WHERE u.id = %s"
        )
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, (id_usuario,))
            fila: dict[str, Any] | None = await cursor.fetchone()
            return fila
