"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from datetime import date
from fastapi import APIRouter, Depends, Query

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.pedido import PaginaPedidos, PedidoCrear, PedidoSalida
from app.services import pedidos

# Permisos según el contrato: ADMIN y VENDEDOR administran pedidos;
# DEPOSITO solo lee y marca entregado.
lectura = Depends(seguridad.require_role("ADMIN", "VENDEDOR", "DEPOSITO"))
solo_admin_vendedor = Depends(seguridad.require_role("ADMIN", "VENDEDOR"))
solo_admin_deposito = Depends(seguridad.require_role("ADMIN", "DEPOSITO"))

router = APIRouter(tags=["pedidos"])


@router.get("/pedidos", response_model=PaginaPedidos)
async def listar(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    estado: str | None = Query(
        default=None, pattern=r"^(PENDIENTE|CONFIRMADO|ENTREGADO|CANCELADO)$"
    ),
    cliente_id: int | None = Query(default=None, gt=0),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = lectura,
) -> PaginaPedidos:
    """Listado paginado de pedidos (sin líneas): ADMIN, VENDEDOR y DEPOSITO."""
    return await pedidos.PedidosService(conexion).listar(
        page=page,
        size=size,
        estado=estado,
        cliente_id=cliente_id,
        desde=desde,
        hasta=hasta,
    )


@router.get("/pedidos/{id_pedido}", response_model=PedidoSalida)
async def obtener(
    id_pedido: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = lectura,
) -> dict:
    """Detalle de un pedido con sus líneas: ADMIN, VENDEDOR y DEPOSITO."""
    return await pedidos.PedidosService(conexion).obtener(id_pedido)


@router.post("/pedidos", response_model=PedidoSalida, status_code=201)
async def crear(
    datos: PedidoCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Crea un pedido PENDIENTE con sus líneas: ADMIN y VENDEDOR."""
    return await pedidos.PedidosService(conexion).crear(datos, usuario["id"])


@router.post("/pedidos/{id_pedido}/confirmar", response_model=PedidoSalida)
async def confirmar(
    id_pedido: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Confirma el pedido con `sp_confirmar_pedido`: ADMIN y VENDEDOR."""
    return await pedidos.PedidosService(conexion).confirmar(
        id_pedido, usuario["id"]
    )


@router.post("/pedidos/{id_pedido}/cancelar", response_model=PedidoSalida)
async def cancelar(
    id_pedido: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Cancela el pedido (solo PENDIENTE): ADMIN y VENDEDOR."""
    return await pedidos.PedidosService(conexion).cancelar(id_pedido)


@router.post("/pedidos/{id_pedido}/entregar", response_model=PedidoSalida)
async def entregar(
    id_pedido: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_deposito,
) -> dict:
    """Marca el pedido ENTREGADO (solo CONFIRMADO): ADMIN y DEPOSITO."""
    return await pedidos.PedidosService(conexion).entregar(id_pedido)
