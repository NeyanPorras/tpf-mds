"""Reglas de negocio de autenticación."""
from typing import Any

import aiomysql

from app.core import seguridad
from app.core.config import settings
from app.core.exceptions import ApiError
from app.repositories import usuarios
from app.schemas.auth import LoginEntrada


class AuthService:
    """Valida credenciales y emite el token de sesión."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def login(self, credenciales: LoginEntrada) -> dict[str, Any]:
        """Verifica email y contraseña con bcrypt; 401 ante cualquier falla."""
        usuario: dict[str, Any] | None = await usuarios.UsuariosRepository(
            self.conexion
        ).buscar_por_email(credenciales.email)

        if (
            usuario is None
            or not seguridad.verificar_password(credenciales.password, usuario["password_hash"])
        ):
            raise ApiError(estado_http=401, mensaje=seguridad.CREDENCIALES_INVALIDAS)

        if not usuario["activo"]:
            raise ApiError(estado_http=401, mensaje=seguridad.CREDENCIALES_INVALIDAS)

        return {
            "access_token": seguridad.crear_token(usuario),
            "token_type": "bearer",
            "expires_in": settings.JWT_EXPIRE_MINUTES * 60,
            "usuario": {
                "id": usuario["id"],
                "nombre": usuario["nombre"],
                "email": usuario["email"],
                "rol": usuario["rol"],
            },
        }
