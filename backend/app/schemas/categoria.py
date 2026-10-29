"""Validación del servidor para Categoría (entrada y salida)."""
from pydantic import BaseModel, ConfigDict, Field


class CategoriaCrear(BaseModel):
    """Body de POST /categorias."""

    nombre: str = Field(min_length=2, max_length=50)


class CategoriaEditar(BaseModel):
    """Body de PUT /categorias/{id}: mismo campo, opcional."""

    nombre: str | None = Field(default=None, min_length=2, max_length=50)


class CategoriaSalida(BaseModel):
    """Respuesta con la forma acordada en docs/contrato-api.md."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
