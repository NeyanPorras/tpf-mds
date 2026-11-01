"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas.

Permisos (docs/contrato-api.md, "Reportes y dashboard"):
ADMIN ve todo, VENDEDOR los reportes de ventas y DEPOSITO los de stock.
El dashboard lo ven los tres roles.
"""
from datetime import date

import aiomysql
from fastapi import APIRouter, Depends, Query

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.reporte import (
    ClienteSobrePromedio,
    Dashboard,
    DetallePedido,
    ProductoRanking,
    ProductoSinVentas,
    StockBajo,
    VentaZonaCategoria,
)
from app.services.reportes import ReportesService, rango_de_fechas

reportes_de_ventas = Depends(seguridad.require_role("ADMIN", "VENDEDOR"))
reportes_de_stock = Depends(seguridad.require_role("ADMIN", "DEPOSITO"))

router = APIRouter(tags=["reportes"])


def rango(
    desde: date | None = Query(default=None, description="AAAA-MM-DD (por defecto, día 1 del mes)"),
    hasta: date | None = Query(default=None, description="AAAA-MM-DD, inclusive (por defecto, fin de mes)"),
) -> tuple[date, date]:
    """Filtro ?desde=&hasta= compartido por todos los reportes con fechas."""
    return rango_de_fechas(desde, hasta)


@router.get("/reportes/detalle-pedidos", response_model=list[DetallePedido])
async def detalle_pedidos(
    fechas: tuple[date, date] = Depends(rango),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_ventas,
) -> list[dict]:
    """INNER JOIN: cada línea vendida con cliente, vendedor y producto."""
    return await ReportesService(conexion).detalle_pedidos(*fechas)


@router.get(
    "/reportes/clientes-sobre-promedio", response_model=list[ClienteSobrePromedio]
)
async def clientes_sobre_promedio(
    fechas: tuple[date, date] = Depends(rango),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_ventas,
) -> list[dict]:
    """Subconsulta: clientes que compraron más que el promedio."""
    return await ReportesService(conexion).clientes_sobre_promedio(*fechas)


@router.get(
    "/reportes/ventas-por-zona-categoria", response_model=list[VentaZonaCategoria]
)
async def ventas_por_zona_categoria(
    fechas: tuple[date, date] = Depends(rango),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_ventas,
) -> list[dict]:
    """GROUP BY: pedidos, unidades y total por zona y categoría."""
    return await ReportesService(conexion).ventas_por_zona_categoria(*fechas)


@router.get("/reportes/ranking-productos", response_model=list[ProductoRanking])
async def ranking_productos(
    limite: int = Query(10, ge=1, le=50),
    fechas: tuple[date, date] = Depends(rango),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_ventas,
) -> list[dict]:
    """GROUP BY: los productos más vendidos por unidades."""
    return await ReportesService(conexion).ranking_productos(*fechas, limite)


@router.get("/reportes/productos-sin-ventas", response_model=list[ProductoSinVentas])
async def productos_sin_ventas(
    dias: int = Query(30, ge=1, le=365),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_stock,
) -> list[dict]:
    """Subconsulta: productos sin ventas en los últimos `dias` días."""
    return await ReportesService(conexion).productos_sin_ventas(dias)


@router.get("/reportes/stock-bajo", response_model=list[StockBajo])
async def stock_bajo(
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = reportes_de_stock,
) -> list[dict]:
    """Productos con stock en o por debajo del mínimo."""
    return await ReportesService(conexion).stock_bajo()


@router.get("/dashboard", response_model=Dashboard)
async def dashboard(
    fechas: tuple[date, date] = Depends(rango),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> dict:
    """Indicadores y ventas por día del rango (por defecto, el mes actual)."""
    return await ReportesService(conexion).dashboard(*fechas)
