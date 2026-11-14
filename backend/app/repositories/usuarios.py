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

    async def listar(self, limite: int, offset: int) -> list[dict[str, Any]]:
        """Página de usuarios (activos e inactivos) ordenados por nombre."""
        consulta = (
            "SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol "
            "FROM usuarios u JOIN roles r ON r.id = u.rol_id "
            "ORDER BY u.nombre LIMIT %s OFFSET %s"
        )
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, (limite, offset))
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def contar(self) -> int:
        """Cantidad total de usuarios (para paginar)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("SELECT COUNT(*) FROM usuarios")
            return (await cursor.fetchone())[0]

    async def id_de_rol(self, nombre_rol: str) -> int | None:
        """Traduce el nombre del rol (ADMIN, ...) a su id en `roles`."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("SELECT id FROM roles WHERE nombre = %s", (nombre_rol,))
            fila = await cursor.fetchone()
            return fila[0] if fila else None

    async def crear(
        self, nombre: str, email: str, password_hash: str, rol_id: int
    ) -> int:
        """Inserta el usuario (activo) y devuelve su id."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO usuarios (nombre, email, password_hash, rol_id) "
                "VALUES (%s, %s, %s, %s)",
                (nombre, email, password_hash, rol_id),
            )
            return cursor.lastrowid

    async def actualizar(
        self,
        id_usuario: int,
        nombre: str,
        email: str,
        rol_id: int,
        activo: bool,
        password_hash: str | None = None,
    ) -> None:
        """Actualiza el usuario en un solo UPDATE (la contraseña, solo si viene)."""
        columnas = "nombre = %s, email = %s, rol_id = %s, activo = %s"
        parametros: list[Any] = [nombre, email, rol_id, activo]
        if password_hash is not None:
            columnas += ", password_hash = %s"
            parametros.append(password_hash)
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                f"UPDATE usuarios SET {columnas} WHERE id = %s", (*parametros, id_usuario)
            )

    async def desactivar(self, id_usuario: int) -> None:
        """Baja lógica: pedidos y movimientos lo referencian (FK RESTRICT)."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute(
                "UPDATE usuarios SET activo = FALSE WHERE id = %s", (id_usuario,)
            )
