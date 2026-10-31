"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends, Query

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.movimiento import (
    IngresoEntrada,
    IngresoSalida,
    PaginaMovimientos,
)
from app.schemas.producto import (
    PaginaProductos,
    ProductoCrear,
    ProductoEditar,
    ProductoSalida,
)
from app.services import movimientos, productos

router = APIRouter(tags=["productos"])


@router.get("/productos", response_model=PaginaProductos)
async def listar(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    categoria_id: int | None = Query(default=None, gt=0),
    proveedor_id: int | None = Query(default=None, gt=0),
    buscar: str | None = Query(default=None, max_length=80),
    bajo_minimo: bool = False,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> PaginaProductos:
    """Listado paginado y filtrado: todos los roles autenticados."""
    return await productos.ProductosService(conexion).listar(
        page=page,
        size=size,
        categoria_id=categoria_id,
        proveedor_id=proveedor_id,
        buscar=buscar,
        bajo_minimo=bajo_minimo,
    )


@router.get("/productos/{id_producto}", response_model=ProductoSalida)
async def obtener(
    id_producto: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> dict:
    """Detalle de un producto: todos los roles autenticados."""
    return await productos.ProductosService(conexion).obtener(id_producto)


@router.post("/productos", response_model=ProductoSalida, status_code=201)
async def crear(
    datos: ProductoCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Crea un producto (stock arranca en 0): solo ADMIN."""
    return await productos.ProductosService(conexion).crear(datos)


@router.put("/productos/{id_producto}", response_model=ProductoSalida)
async def editar(
    id_producto: int,
    datos: ProductoEditar,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Edita un producto (el stock no se edita por acá): solo ADMIN."""
    return await productos.ProductosService(conexion).editar(id_producto, datos)


@router.delete("/productos/{id_producto}", status_code=204)
async def eliminar(
    id_producto: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> None:
    """Borra un producto (409 si está en pedidos): solo ADMIN."""
    return await productos.ProductosService(conexion).eliminar(id_producto)


@router.post(
    "/productos/{id_producto}/ingresos",
    response_model=IngresoSalida,
    status_code=201,
)
async def registrar_ingreso(
    id_producto: int,
    datos: IngresoEntrada,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN", "DEPOSITO")),
) -> IngresoSalida:
    """Ingresa mercadería: movimiento ENTRADA + suma de stock, atómicos."""
    resultado = await movimientos.MovimientosService(conexion).registrar_entrada(
        id_producto, datos, id_usuario=int(usuario["id"])
    )
    return IngresoSalida(**resultado)


@router.get(
    "/productos/{id_producto}/movimientos",
    response_model=PaginaMovimientos,
)
async def listar_movimientos(
    id_producto: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> PaginaMovimientos:
    """Historial de movimientos del producto: todos los roles autenticados."""
    return await movimientos.MovimientosService(conexion).listar(
        id_producto, page=page, size=size
    )
