"""Seguridad: hashing de contraseñas (bcrypt), tokens JWT y dependencias.

`get_current_user` y `require_role` son dependencias de FastAPI: los routers
las declaran con `Depends(...)` / `Security(...)` para pedir autenticación
o un rol concreto. Al declararlas con `HTTPBearer`, Swagger muestra el
botón Authorize y el candado en los endpoints protegidos.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import bcrypt
import jwt
from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import aiomysql

from app.core import database
from app.core.config import settings
from app.core.exceptions import ApiError
from app.repositories import usuarios

# El comando de login manda el mismo mensaje tanto si falla el email,
# la contraseña o el usuario está inactivo (evita enumerar cuentas).
CREDENCIALES_INVALIDAS = "Credenciales incorrectas."

# `auto_error=False` para decidir nosotros el mensaje 401 en español
# (el default de FastAPI manda "Not authenticated" en otro formato).
esquema_bearer = HTTPBearer(bearerFormat="JWT", auto_error=False)


def hash_password(contraseña: str) -> str:
    """Genera un hash bcrypt para guardar en `usuarios.password_hash`."""
    sal = bcrypt.gensalt()
    return bcrypt.hashpw(contraseña.encode("utf-8"), sal).decode("utf-8")


def verificar_password(contraseña: str, hash: str) -> bool:
    """Compara la contraseña en claro contra el hash guardado en la base."""
    try:
        return bcrypt.checkpw(contraseña.encode("utf-8"), hash.encode("utf-8"))
    except ValueError:
        return False


def crear_token(usuario: dict[str, Any]) -> str:
    """Emite un token HS256 con el id y el rol del usuario."""
    expira = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    claims = {
        "sub": str(usuario["id"]),
        "rol": usuario["rol"],
        "exp": expira,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm="HS256")


def decodificar_token(token: str) -> dict[str, Any]:
    """Devuelve los claims del token o levanta 401 si no es válido ni vencido."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise ApiError(
            estado_http=401,
            mensaje="Token inválido o vencido.",
        )


async def get_current_user(
    credenciales: HTTPAuthorizationCredentials | None = Security(esquema_bearer),
    conexion: aiomysql.Connection = Depends(database.get_conexion),
) -> dict[str, Any]:
    """Dependencia: valida `Authorization: Bearer <token>` y devuelve el usuario.

    El usuario se vuelve a leer de la base por si fue borrado o desactivado
    después de emitirse el token.
    """
    if credenciales is None:
        raise ApiError(estado_http=401, mensaje="No autenticado.")
    claims = decodificar_token(credenciales.credentials)

    id_usuario = int(claims.get("sub", 0))
    usuario = await usuarios.UsuariosRepository(conexion).obtener_por_id(id_usuario)
    if usuario is None or not usuario["activo"]:
        raise ApiError(estado_http=401, mensaje="Token inválido o vencido.")
    return usuario


def require_role(*roles: str) -> Callable[..., Any]:
    """Fábrica de dependencia: exige un rol de los pasados (`ADMIN`, ...).

    Uso en un router: `Depends(require_role("ADMIN"))`.
    """

    async def verificar(
        usuario: dict[str, Any] = Security(get_current_user),
    ) -> dict[str, Any]:
        if usuario["rol"] not in roles:
            raise ApiError(
                estado_http=403,
                mensaje="El rol no tiene permiso para esta acción.",
            )
        return usuario

    return verificar
