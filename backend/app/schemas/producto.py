"""Validación del servidor para Producto (entrada y salida)."""
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProductoCrear(BaseModel):
    """Body de POST /productos.

    `stock` NO se recibe: solo cambia con ingresos de mercadería
    o pedidos confirmados.
    """

    nombre: str = Field(min_length=2, max_length=80)
    presentacion: str = Field(min_length=1, max_length=40)
    precio: Decimal = Field(gt=0, le=99_999_999.99)
    stock_minimo: int = Field(default=0, ge=0)
    categoria_id: int = Field(gt=0)
    proveedor_id: int = Field(gt=0)

    @model_validator(mode="after")
    def normalizar_precio(self) -> "ProductoCrear":
        """Máximo 2 decimales (la base guarda DECIMAL(12,2))."""
        self.precio = self.normalizar(self.precio)
        return self

    @staticmethod
    def normalizar(precio: Decimal) -> Decimal:
        equivalentes_con_2_decimales = precio.quantize(Decimal("0.01"))
        if precio != equivalentes_con_2_decimales:
            raise ValueError("El precio admite como máximo 2 decimales.")
        return equivalentes_con_2_decimales


class ProductoEditar(BaseModel):
    """Body de PUT /productos/{id}: mismos campos, todos opcionales."""

    nombre: str | None = Field(default=None, min_length=2, max_length=80)
    presentacion: str | None = Field(default=None, min_length=1, max_length=40)
    precio: Decimal | None = Field(default=None, gt=0, le=99_999_999.99)
    stock_minimo: int | None = Field(default=None, ge=0)
    categoria_id: int | None = Field(default=None, gt=0)
    proveedor_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def normalizar_precio(self) -> "ProductoEditar":
        if self.precio is not None:
            self.precio = ProductoCrear.normalizar(self.precio)
        return self


class CategoriaAnidada(BaseModel):
    """Referencia a la categoría dentro de un Producto."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class ProveedorAnidado(BaseModel):
    """Referencia al proveedor dentro de un Producto."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    razon_social: str


class ProductoSalida(BaseModel):
    """Respuesta con la forma acordada en docs/contrato-api.md."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    presentacion: str
    precio: float
    stock: int
    stock_minimo: int
    categoria: CategoriaAnidada
    proveedor: ProveedorAnidado


class PaginaProductos(BaseModel):
    """Respuesta paginada de GET /productos (?page=&size=)."""

    items: list[ProductoSalida]
    total: int
    page: int
    size: int
