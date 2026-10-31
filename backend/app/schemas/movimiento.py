"""Validación del servidor para movimientos de stock (entrada y salida)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IngresoEntrada(BaseModel):
    """Body de POST /productos/{id}/ingresos."""

    cantidad: int = Field(gt=0, le=1_000_000)
    observacion: str | None = Field(default=None, max_length=200)


class IngresoSalida(BaseModel):
    """Respuesta del ingreso, como acordamos en docs/contrato-api.md."""

    movimiento_id: int
    producto_id: int
    stock_actual: int


class UsuarioDelMovimiento(BaseModel):
    """Quién registró el movimiento."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class MovimientoSalida(BaseModel):
    """Un movimiento ENTRADA o SALIDA del listado."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    cantidad: int
    fecha: datetime
    usuario: UsuarioDelMovimiento
    pedido_id: int | None


class PaginaMovimientos(BaseModel):
    """Respuesta paginada de GET /productos/{id}/movimientos."""

    items: list[MovimientoSalida]
    total: int
    page: int
    size: int
