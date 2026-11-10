"""Reglas de los reportes: rango de fechas por defecto y validación."""
import calendar
from datetime import date
from typing import Any

from app.core.exceptions import ApiError
from app.repositories import reportes


def rango_de_fechas(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Completa el rango con el mes en curso y verifica que tenga sentido."""
    hoy = date.today()
    if desde is None:
        desde = hoy.replace(day=1)
    if hasta is None:
        hasta = hoy.replace(day=calendar.monthrange(hoy.year, hoy.month)[1])
    if desde > hasta:
        raise ApiError(
            estado_http=422,
            mensaje="La fecha 'desde' no puede ser posterior a 'hasta'.",
            detalle=[{"field": "desde", "message": "Debe ser anterior o igual a 'hasta'."}],
        )
    return desde, hasta


class ReportesService:
    """Reportes de ventas y stock, y los indicadores del dashboard."""

    def __init__(self, conexion: Any) -> None:
        self.repo = reportes.ReportesRepository(conexion)

    async def detalle_pedidos(self, desde: date, hasta: date) -> list[dict[str, Any]]:
        return await self.repo.detalle_pedidos(desde, hasta)

    async def clientes_sobre_promedio(
        self, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        return await self.repo.clientes_sobre_promedio(desde, hasta)

    async def productos_sin_ventas(self, dias: int) -> list[dict[str, Any]]:
        return await self.repo.productos_sin_ventas(dias)

    async def ventas_por_zona_categoria(
        self, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        return await self.repo.ventas_por_zona_categoria(desde, hasta)

    async def ranking_productos(
        self, desde: date, hasta: date, limite: int
    ) -> list[dict[str, Any]]:
        return await self.repo.ranking_productos(desde, hasta, limite)

    async def stock_bajo(self) -> list[dict[str, Any]]:
        return await self.repo.stock_bajo()

    async def dashboard(self, desde: date, hasta: date) -> dict[str, Any]:
        resumen = await self.repo.resumen_dashboard(desde, hasta)
        por_dia = await self.repo.ventas_por_dia(desde, hasta)
        return {**resumen, "ventas_por_dia": por_dia}
