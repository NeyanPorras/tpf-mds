"""Único lugar (junto a los demás repositorios) donde vive SQL.

Las consultas de reportes salen de database/consultas/reportes.sql (D4):
las variables @desde, @hasta y @dias de ese archivo acá son parámetros %s.
Si cambia una consulta, se cambia en los dos lugares en el mismo PR.

Una venta es un pedido CONFIRMADO o ENTREGADO. El rango de fechas es
inclusivo: `hasta` abarca el día completo.
"""
from datetime import date
from typing import Any

import aiomysql

ES_VENTA = "p.estado IN ('CONFIRMADO', 'ENTREGADO')"
EN_RANGO = "p.fecha >= %s AND p.fecha < %s + INTERVAL 1 DAY"


class ReportesRepository:
    """Consultas de solo lectura para reportes y dashboard."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def _filas(self, consulta: str, parametros: tuple) -> list[dict[str, Any]]:
        async with self.conexion.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(consulta, parametros)
            filas: list[dict[str, Any]] = await cursor.fetchall()
            return filas

    async def detalle_pedidos(self, desde: date, hasta: date) -> list[dict[str, Any]]:
        """INNER JOIN de 5 tablas: cada línea vendida con su contexto."""
        return await self._filas(
            "SELECT p.id AS pedido_id, p.fecha, c.razon_social AS cliente, c.zona, "
            "u.nombre AS vendedor, CONCAT(pr.nombre, ' ', pr.presentacion) AS producto, "
            "d.cantidad, d.cantidad * d.precio_unitario AS subtotal "
            "FROM pedidos p "
            "INNER JOIN clientes c ON c.id = p.cliente_id "
            "INNER JOIN usuarios u ON u.id = p.usuario_id "
            "INNER JOIN detalle_pedido d ON d.pedido_id = p.id "
            "INNER JOIN productos pr ON pr.id = d.producto_id "
            f"WHERE {ES_VENTA} AND {EN_RANGO} "
            "ORDER BY p.fecha, p.id, d.id",
            (desde, hasta),
        )

    async def clientes_sobre_promedio(
        self, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        """Subconsulta: clientes cuyo total supera el promedio de todos."""
        return await self._filas(
            "WITH totales AS ("
            "  SELECT p.cliente_id, SUM(p.total) AS total_comprado FROM pedidos p "
            f"  WHERE {ES_VENTA} AND {EN_RANGO} GROUP BY p.cliente_id"
            ") "
            "SELECT c.id AS cliente_id, c.razon_social, t.total_comprado, "
            "ROUND((SELECT AVG(total_comprado) FROM totales), 2) AS promedio_general "
            "FROM totales t INNER JOIN clientes c ON c.id = t.cliente_id "
            "WHERE t.total_comprado > (SELECT AVG(total_comprado) FROM totales) "
            "ORDER BY t.total_comprado DESC",
            (desde, hasta),
        )

    async def productos_sin_ventas(self, dias: int) -> list[dict[str, Any]]:
        """Subconsulta NOT IN: productos sin ventas en los últimos `dias` días."""
        return await self._filas(
            "SELECT pr.id AS producto_id, pr.nombre, pr.presentacion, pr.stock "
            "FROM productos pr WHERE pr.id NOT IN ("
            "  SELECT d.producto_id FROM detalle_pedido d "
            "  INNER JOIN pedidos p ON p.id = d.pedido_id "
            f"  WHERE {ES_VENTA} AND p.fecha >= CURDATE() - INTERVAL %s DAY"
            ") ORDER BY pr.nombre",
            (dias,),
        )

    async def ventas_por_zona_categoria(
        self, desde: date, hasta: date
    ) -> list[dict[str, Any]]:
        """GROUP BY zona y categoría."""
        return await self._filas(
            "SELECT c.zona, cat.nombre AS categoria, COUNT(DISTINCT p.id) AS pedidos, "
            "SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS total "
            "FROM pedidos p "
            "INNER JOIN clientes c ON c.id = p.cliente_id "
            "INNER JOIN detalle_pedido d ON d.pedido_id = p.id "
            "INNER JOIN productos pr ON pr.id = d.producto_id "
            "INNER JOIN categorias cat ON cat.id = pr.categoria_id "
            f"WHERE {ES_VENTA} AND {EN_RANGO} "
            "GROUP BY c.zona, cat.nombre ORDER BY c.zona, total DESC",
            (desde, hasta),
        )

    async def ranking_productos(
        self, desde: date, hasta: date, limite: int
    ) -> list[dict[str, Any]]:
        """GROUP BY producto: los más vendidos por unidades."""
        return await self._filas(
            "SELECT pr.id AS producto_id, CONCAT(pr.nombre, ' ', pr.presentacion) AS nombre, "
            "SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS total "
            "FROM detalle_pedido d "
            "INNER JOIN pedidos p ON p.id = d.pedido_id "
            "INNER JOIN productos pr ON pr.id = d.producto_id "
            f"WHERE {ES_VENTA} AND {EN_RANGO} "
            "GROUP BY pr.id, pr.nombre, pr.presentacion "
            "ORDER BY unidades DESC, total DESC LIMIT %s",
            (desde, hasta, limite),
        )

    async def stock_bajo(self) -> list[dict[str, Any]]:
        """Productos con stock en o por debajo del mínimo."""
        return await self._filas(
            "SELECT pr.id AS producto_id, CONCAT(pr.nombre, ' ', pr.presentacion) AS nombre, "
            "pr.stock, pr.stock_minimo, pv.razon_social AS proveedor "
            "FROM productos pr INNER JOIN proveedores pv ON pv.id = pr.proveedor_id "
            "WHERE pr.stock <= pr.stock_minimo "
            "ORDER BY pr.stock - pr.stock_minimo, pr.nombre",
            (),
        )

    async def resumen_dashboard(self, desde: date, hasta: date) -> dict[str, Any]:
        """Indicadores del dashboard en una sola consulta."""
        filas = await self._filas(
            "SELECT "
            f"(SELECT COALESCE(SUM(p.total), 0) FROM pedidos p WHERE {ES_VENTA} AND {EN_RANGO})"
            " AS ventas_mes, "
            "(SELECT COUNT(*) FROM pedidos WHERE estado = 'PENDIENTE') AS pedidos_pendientes, "
            "(SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo)"
            " AS productos_bajo_minimo, "
            f"(SELECT COUNT(DISTINCT p.cliente_id) FROM pedidos p WHERE {ES_VENTA} AND {EN_RANGO})"
            " AS clientes_activos",
            (desde, hasta, desde, hasta),
        )
        return filas[0]

    async def ventas_por_dia(self, desde: date, hasta: date) -> list[dict[str, Any]]:
        """GROUP BY día: total vendido por fecha, para el gráfico."""
        return await self._filas(
            "SELECT DATE(p.fecha) AS fecha, SUM(p.total) AS total FROM pedidos p "
            f"WHERE {ES_VENTA} AND {EN_RANGO} "
            "GROUP BY DATE(p.fecha) ORDER BY fecha",
            (desde, hasta),
        )
