"""Validación del servidor para pedidos (crear y responder)."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LineaNueva(BaseModel):
    """Una línea de POST /pedidos: el cliente no manda el precio."""

    producto_id: int = Field(gt=0)
    cantidad: int = Field(gt=0, le=100_000)


class PedidoCrear(BaseModel):
    """Body de POST /pedidos."""

    cliente_id: int = Field(gt=0)
    lineas: list[LineaNueva] = Field(min_length=1)


class ClienteAnidado(BaseModel):
    """Referencia al cliente dentro de un Pedido."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    razon_social: str


class VendedorAnidado(BaseModel):
    """El usuario que cargó el pedido."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class ProductoDeLinea(BaseModel):
    """Referencia al producto dentro de una línea."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    presentacion: str


class LineaSalida(BaseModel):
    """Una línea del pedido con su subtotal."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    producto: ProductoDeLinea
    cantidad: int
    precio_unitario: float
    subtotal: float


class PedidoSalida(BaseModel):
    """Respuesta de GET/POST/PUT, con la forma acordada en docs/contrato-api.md."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: datetime
    estado: str
    total: float
    cliente: ClienteAnidado
    vendedor: VendedorAnidado
    lineas: list[LineaSalida]


class PaginaPedidos(BaseModel):
    """Respuesta paginada de GET /pedidos (?page=&size=)."""

    items: list[PedidoSalida]
    total: int
    page: int
    size: int
