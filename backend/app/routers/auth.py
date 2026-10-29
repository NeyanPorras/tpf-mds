"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends, Security

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.auth import LoginEntrada, LoginSalida, UsuarioSalida
from app.services import auth

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginSalida)
async def login(
    credenciales: LoginEntrada,
    conexion: aiomysql.Connection = Depends(get_conexion),
) -> LoginSalida:
    """Intercambia email y contraseña por un token JWT."""
    resultado = await auth.AuthService(conexion).login(credenciales)
    return LoginSalida(**resultado)


@router.get("/auth/me", response_model=UsuarioSalida)
async def me(
    usuario: dict = Security(seguridad.get_current_user),
) -> dict:
    """Devuelve el usuario dueño del token actual."""
    return usuario
