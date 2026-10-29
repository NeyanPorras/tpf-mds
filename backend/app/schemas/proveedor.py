"""Validación del servidor para Proveedor (entrada y salida)."""
from pydantic import BaseModel, ConfigDict, Field

# Formato del CUIT: XIX-XXXXXXXX-I (lo valida también la base).
CUIT = r"^\d{2}-\d{8}-\d$"


class ProveedorCrear(BaseModel):
    """Body de POST /proveedores."""

    razon_social: str = Field(min_length=2, max_length=120)
    cuit: str = Field(pattern=CUIT)
    telefono: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120, pattern=r"^\S+@\S+\.\S+$")


class ProveedorEditar(BaseModel):
    """Body de PUT /proveedores/{id}: mismos campos, todos opcionales."""

    razon_social: str | None = Field(default=None, min_length=2, max_length=120)
    cuit: str | None = Field(default=None, pattern=CUIT)
    telefono: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120, pattern=r"^\S+@\S+\.\S+$")


class ProveedorSalida(BaseModel):
    """Respuesta con la forma acordada en docs/contrato-api.md."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    razon_social: str
    cuit: str
    telefono: str | None
    email: str | None
