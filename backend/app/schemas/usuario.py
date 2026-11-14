"""Validación del servidor para Usuario (entrada y salida)."""
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, field_validator

# Los roles válidos son exactamente los de la tabla `roles`.
Rol = Literal["ADMIN", "VENDEDOR", "DEPOSITO"]


def _validar_password(valor: str) -> str:
    """Política del contrato: mínimo 8 caracteres con al menos un número."""
    if len(valor) < 8 or not any(caracter.isdigit() for caracter in valor):
        raise ValueError("La contraseña necesita al menos 8 caracteres y un número.")
    # bcrypt rechaza más de 72 BYTES (una "ñ" ocupa 2): se valida acá para
    # devolver 422 en lugar de un 500 al hashear.
    if len(valor.encode("utf-8")) > 72:
        raise ValueError("La contraseña es demasiado larga (máximo 72 bytes).")
    return valor


def _normalizar_email(valor: Any) -> Any:
    """El email se guarda sin espacios y en minúsculas (es único en la base)."""
    return valor.strip().lower() if isinstance(valor, str) else valor


def _recortar(valor: Any) -> Any:
    """Saca espacios de los extremos: un nombre de solo espacios queda vacío (422)."""
    return valor.strip() if isinstance(valor, str) else valor


class UsuarioCrear(BaseModel):
    """Body de POST /usuarios."""

    nombre: str = Field(min_length=2, max_length=80)
    email: EmailStr = Field(max_length=120)
    password: str
    rol: Rol

    _email = field_validator("email", mode="before")(_normalizar_email)
    _nombre = field_validator("nombre", mode="before")(_recortar)

    @field_validator("password")
    @classmethod
    def politica_password(cls, valor: str) -> str:
        return _validar_password(valor)


class UsuarioEditar(BaseModel):
    """Body de PUT /usuarios/{id}: mismos campos, todos opcionales.

    `password` solo se manda si se cambia. `activo: true` reactiva un
    usuario desactivado con DELETE.
    """

    nombre: str | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr | None = Field(default=None, max_length=120)
    password: str | None = None
    rol: Rol | None = None
    activo: bool | None = None

    _email = field_validator("email", mode="before")(_normalizar_email)
    _nombre = field_validator("nombre", mode="before")(_recortar)

    @field_validator("nombre", "email", "password", "rol", "activo", mode="before")
    @classmethod
    def rechazar_null(cls, valor: Any, info: ValidationInfo) -> Any:
        """422 si mandan null: para no cambiar un campo, se omite."""
        if valor is None:
            raise ValueError(f"'{info.field_name}' no admite null: omití el campo.")
        return valor

    @field_validator("password")
    @classmethod
    def politica_password(cls, valor: str) -> str:
        return _validar_password(valor)


class UsuarioAdmin(BaseModel):
    """Usuario como lo ve el ADMIN: nunca incluye el hash."""

    id: int
    nombre: str
    email: str
    rol: str
    activo: bool


class PaginaUsuarios(BaseModel):
    """Respuesta paginada de GET /usuarios (?page=&size=)."""

    items: list[UsuarioAdmin]
    total: int
    page: int
    size: int
