"""Reportes contra MySQL REAL, con los datos de prueba de D2 (ago-oct 2026).

Los valores esperados salen de database/04_seed_pedidos.sql y coinciden
con lo que da database/consultas/reportes.sql. Los pedidos que crean otros
tests llevan la fecha del día en que corren; por eso el rango cierra el 30/10.

Corre solo si la base está disponible; si no, se salta el módulo.
"""
import socket

import aiomysql
import pytest
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.core.config import settings
from app.main import crear_app

try:
    _socket = socket.create_connection((settings.DB_HOST, settings.DB_PORT), timeout=2)
    _socket.close()
except OSError:
    pytest.skip(
        f"MySQL no está disponible en {settings.DB_HOST}:{settings.DB_PORT}",
        allow_module_level=True,
    )

ADMIN = {"id": 1, "nombre": "Ana Admin", "rol": "ADMIN"}
# El seed termina el 27/10; el 31/10 hay pedidos creados por test_pedidos_db.py.
RANGO = "desde=2026-08-01&hasta=2026-10-30"


@pytest.fixture(scope="module")
def cliente() -> TestClient:
    """Cada request abre su propia conexión (ver test_pedidos_db.py)."""
    app = crear_app()

    async def conexion_real():
        conn = await aiomysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
            autocommit=True,
        )
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[database.get_conexion] = conexion_real
    return TestClient(app)


def _get(cliente: TestClient, ruta: str) -> list | dict:
    header = {"Authorization": f"Bearer {seguridad.crear_token(ADMIN)}"}
    respuesta = cliente.get(f"/api{ruta}", headers=header)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_clientes_sobre_promedio(cliente: TestClient) -> None:
    filas = _get(cliente, f"/reportes/clientes-sobre-promedio?{RANGO}")
    assert len(filas) == 5
    assert filas[0]["razon_social"] == "Parrilla Don Carlos"
    assert filas[0]["total_comprado"] == 2420400.0
    assert {fila["promedio_general"] for fila in filas} == {1097630.77}
    assert all(fila["total_comprado"] > fila["promedio_general"] for fila in filas)


def test_ranking_productos(cliente: TestClient) -> None:
    filas = _get(cliente, f"/reportes/ranking-productos?limite=2&{RANGO}")
    assert [(fila["producto_id"], fila["unidades"]) for fila in filas] == [(14, 51), (5, 41)]
    assert filas[0]["total"] == 1530000.0


def test_los_totales_coinciden_entre_reportes(cliente: TestClient) -> None:
    """El mismo rango suma lo mismo por línea, por zona y en el dashboard."""
    detalle = _get(cliente, f"/reportes/detalle-pedidos?{RANGO}")
    por_zona = _get(cliente, f"/reportes/ventas-por-zona-categoria?{RANGO}")
    tablero = _get(cliente, f"/dashboard?{RANGO}")

    total_detalle = round(sum(fila["subtotal"] for fila in detalle), 2)
    assert total_detalle > 0
    assert round(sum(fila["total"] for fila in por_zona), 2) == total_detalle
    assert tablero["ventas_mes"] == total_detalle
    assert round(sum(dia["total"] for dia in tablero["ventas_por_dia"]), 2) == total_detalle
    # 29 entregados + 2 confirmados del seed; ninguno pendiente ni cancelado.
    assert len({fila["pedido_id"] for fila in detalle}) == 31


def test_el_rango_es_inclusivo(cliente: TestClient) -> None:
    """Un solo día: `hasta` incluye las ventas de todo ese día."""
    detalle = _get(cliente, f"/reportes/detalle-pedidos?{RANGO}")
    dia = detalle[0]["fecha"][:10]
    del_dia = _get(cliente, f"/reportes/detalle-pedidos?desde={dia}&hasta={dia}")
    assert del_dia
    assert all(fila["fecha"].startswith(dia) for fila in del_dia)
    assert len(del_dia) == sum(1 for fila in detalle if fila["fecha"].startswith(dia))


def test_stock_bajo_solo_trae_productos_bajo_minimo(cliente: TestClient) -> None:
    filas = _get(cliente, "/reportes/stock-bajo")
    assert filas
    assert all(fila["stock"] <= fila["stock_minimo"] for fila in filas)
    tablero = _get(cliente, f"/dashboard?{RANGO}")
    assert tablero["productos_bajo_minimo"] == len(filas)


def test_productos_sin_ventas_excluye_los_vendidos(cliente: TestClient) -> None:
    """Con 365 días, nada de lo vendido en el seed aparece en la lista."""
    vendidos = {fila["producto_id"] for fila in _get(cliente, f"/reportes/ranking-productos?limite=50&{RANGO}")}
    sin_ventas = {fila["producto_id"] for fila in _get(cliente, "/reportes/productos-sin-ventas?dias=365")}
    assert vendidos
    assert not vendidos & sin_ventas
