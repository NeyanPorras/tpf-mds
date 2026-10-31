"""Validación del servidor para Cliente (entrada y salida)."""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

# Formato del CUIT: XIX-XXXXXXXX-I (lo valida también la base).
CUIT = r"^\d{2}-\d{8}-\d$"

# Las zonas válidas son exactamente tres: el enum de la base las fija.
Zona = Literal["Centro", "Norte", "Sur"]


class ClienteCrear(BaseModel):
    """Body de POST /clientes."""

    razon_social: str = Field(min_length=2, max_length=120)
    cuit: str = Field(pattern=CUIT)
    direccion: str = Field(min_length=2, max_length=150)
    zona: Zona
    telefono: str | None = Field(default=None, max_length=30)


class ClienteEditar(BaseModel):
    """Body de PUT /clientes/{id}: mismos campos, todos opcionales.

    Omitir un campo significa "no cambiarlo". Mandarlo en `null` significa
    "vaciarlo": solo vale para `telefono`, que es opcional en la base.
    """

    razon_social: str | None = Field(default=None, min_length=2, max_length=120)
    cuit: str | None = Field(default=None, pattern=CUIT)
    direccion: str | None = Field(default=None, min_length=2, max_length=150)
    zona: Zona | None = None
    telefono: str | None = Field(default=None, max_length=30)

    @field_validator("razon_social", "cuit", "direccion", "zona", mode="before")
    @classmethod
    def rechazar_null(cls, valor: Any, info: ValidationInfo) -> Any:
        """422 si mandan null en un campo que la base no permite vaciar."""
        if valor is None:
            raise ValueError(f"'{info.field_name}' no admite null: omití el campo.")
        return valor


class ClienteSalida(BaseModel):
    """Respuesta con la forma acordada en docs/contrato-api.md."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    razon_social: str
    cuit: str
    direccion: str
    zona: str
    telefono: str | None


class PaginaClientes(BaseModel):
    """Respuesta paginada de GET /clientes (?page=&size=)."""

    items: list[ClienteSalida]
    total: int
    page: int
    size: int
