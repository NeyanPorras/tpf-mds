"""Reglas de negocio del CRUD de usuarios (solo ADMIN)."""
from typing import Any

import aiomysql

from app.core import seguridad
from app.core.exceptions import ApiError
from app.repositories import usuarios
from app.schemas.usuario import PaginaUsuarios, UsuarioCrear, UsuarioEditar

EMAIL_REPETIDO = "Ya existe un usuario con ese email."
SIN_AUTOBLOQUEO = "No podés desactivarte ni quitarte el rol ADMIN a vos mismo."


class UsuariosService:
    """Alta, edición y baja lógica de usuarios.

    - El email es único y la contraseña se guarda con bcrypt.
    - DELETE desactiva: los pedidos y movimientos referencian al usuario.
      Un usuario inactivo no puede loguearse y su token deja de valer
      (get_current_user lo vuelve a leer de la base en cada request).
    - El ADMIN que opera no puede bloquearse a sí mismo.
    """

    def __init__(self, conexion: Any) -> None:
        self.repo = usuarios.UsuariosRepository(conexion)

    async def listar(self, page: int, size: int) -> PaginaUsuarios:
        items = await self.repo.listar(size, (page - 1) * size)
        total = await self.repo.contar()
        return PaginaUsuarios(items=items, total=total, page=page, size=size)

    async def obtener(self, id_usuario: int) -> dict[str, Any]:
        fila = await self.repo.obtener_por_id(id_usuario)
        if fila is None:
            raise ApiError(estado_http=404, mensaje="El usuario no existe.")
        return fila

    async def crear(self, datos: UsuarioCrear) -> dict[str, Any]:
        await self._email_libre(datos.email)
        rol_id = await self._id_de_rol(datos.rol)
        try:
            id_nuevo = await self.repo.crear(
                datos.nombre, datos.email, seguridad.hash_password(datos.password), rol_id
            )
        except aiomysql.IntegrityError as error:  # carrera con otro alta igual
            raise ApiError(estado_http=409, mensaje=EMAIL_REPETIDO) from error
        return await self.obtener(id_nuevo)

    async def editar(
        self, id_usuario: int, datos: UsuarioEditar, operador: dict[str, Any]
    ) -> dict[str, Any]:
        actual = await self.obtener(id_usuario)
        nuevo = {
            "nombre": datos.nombre if datos.nombre is not None else actual["nombre"],
            "email": datos.email if datos.email is not None else actual["email"],
            "rol": datos.rol if datos.rol is not None else actual["rol"],
            "activo": datos.activo if datos.activo is not None else bool(actual["activo"]),
        }
        if id_usuario == operador["id"] and (nuevo["rol"] != "ADMIN" or not nuevo["activo"]):
            raise ApiError(estado_http=409, mensaje=SIN_AUTOBLOQUEO)
        if nuevo["email"] != actual["email"]:
            await self._email_libre(nuevo["email"])
        rol_id = await self._id_de_rol(nuevo["rol"])
        try:
            await self.repo.actualizar(
                id_usuario, nuevo["nombre"], nuevo["email"], rol_id, nuevo["activo"]
            )
        except aiomysql.IntegrityError as error:
            raise ApiError(estado_http=409, mensaje=EMAIL_REPETIDO) from error
        if datos.password is not None:
            await self.repo.cambiar_password(
                id_usuario, seguridad.hash_password(datos.password)
            )
        return await self.obtener(id_usuario)

    async def desactivar(self, id_usuario: int, operador: dict[str, Any]) -> None:
        if id_usuario == operador["id"]:
            raise ApiError(estado_http=409, mensaje=SIN_AUTOBLOQUEO)
        await self.obtener(id_usuario)
        await self.repo.desactivar(id_usuario)

    async def _email_libre(self, email: str) -> None:
        duplicado = await self.repo.buscar_por_email(email)
        if duplicado is not None:
            raise ApiError(
                estado_http=409,
                mensaje=EMAIL_REPETIDO,
                detalle={"usuario": duplicado["id"]},
            )

    async def _id_de_rol(self, nombre_rol: str) -> int:
        rol_id = await self.repo.id_de_rol(nombre_rol)
        if rol_id is None:  # el schema ya limita los roles: sería un seed incompleto
            raise ApiError(estado_http=500, mensaje=f"El rol {nombre_rol} no existe en la base.")
        return rol_id
