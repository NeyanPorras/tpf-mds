"""Respuestas de reportes y dashboard, con la forma de docs/contrato-api.md.

Los importes van como float para que el JSON tenga números (un Decimal
saldría como texto).
"""
from datetime import date, datetime

from pydantic import BaseModel


class DetallePedido(BaseModel):
    pedido_id: int
    fecha: datetime
    cliente: str
    zona: str
    vendedor: str
    producto: str
    cantidad: int
    subtotal: float


class ClienteSobrePromedio(BaseModel):
    cliente_id: int
    razon_social: str
    total_comprado: float
    promedio_general: float


class ProductoSinVentas(BaseModel):
    producto_id: int
    nombre: str
    presentacion: str
    stock: int


class VentaZonaCategoria(BaseModel):
    zona: str
    categoria: str
    pedidos: int
    unidades: int
    total: float


class ProductoRanking(BaseModel):
    producto_id: int
    nombre: str
    unidades: int
    total: float


class StockBajo(BaseModel):
    producto_id: int
    nombre: str
    stock: int
    stock_minimo: int
    proveedor: str


class VentaDia(BaseModel):
    fecha: date
    total: float


class Dashboard(BaseModel):
    ventas_mes: float
    pedidos_pendientes: int
    productos_bajo_minimo: int
    clientes_activos: int
    ventas_por_dia: list[VentaDia]
