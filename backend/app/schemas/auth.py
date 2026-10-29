"""Modelos Pydantic de entrada y salida para autenticación."""
from pydantic import BaseModel, EmailStr


class LoginEntrada(BaseModel):
    """Credenciales que manda el cliente."""
    email: EmailStr
    password: str  # solo presencial: la política de formato aplica al crear usuarios


class UsuarioSalida(BaseModel):
    """El usuario que siempre viaja al frontend (nunca el hash)."""
    id: int
    nombre: str
    email: str
    rol: str


class LoginSalida(BaseModel):
    """Respuesta del login, con la forma acordada en el contrato."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioSalida
