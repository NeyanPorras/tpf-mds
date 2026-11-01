"""Reportes y dashboard (B7): permisos por rol, fechas y forma de la respuesta.

Simula la base como test_clientes.py: no hace falta Docker ni MySQL.
Los resultados reales de las consultas se prueban en test_reportes_db.py.
"""
import calendar
from datetime import date
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.main import crear_app

ADMIN = {
    "id": 1,
    "nombre": "Ana Admin",
    "email": "admin@distribuidora.com",
    "password_hash": "x",
    "activo": True,
    "rol": "ADMIN",
}
VENDEDOR = {**ADMIN, "id": 2, "nombre": "Valen Vendedor", "rol": "VENDEDOR"}
DEPOSITO = {**ADMIN, "id": 3, "nombre": "Dami Deposito", "rol": "DEPOSITO"}

REPO = "app.repositories.reportes.ReportesRepository"

# Ruta -> método del repositorio que la responde.
VENTAS = {
    "/api/reportes/detalle-pedidos": "detalle_pedidos",
    "/api/reportes/clientes-sobre-promedio": "clientes_sobre_promedio",
    "/api/reportes/ventas-por-zona-categoria": "ventas_por_zona_categoria",
    "/api/reportes/ranking-productos": "ranking_productos",
}
STOCK = {
    "/api/reportes/productos-sin-ventas": "productos_sin_ventas",
    "/api/reportes/stock-bajo": "stock_bajo",
}


@pytest.fixture()
def cliente() -> TestClient:
    app = crear_app()

    async def conexion_falsa() -> Any:
        yield None

    app.dependency_overrides[database.get_conexion] = conexion_falsa
    return TestClient(app)


def _como(usuario: dict[str, Any]) -> tuple[Any, dict[str, str]]:
    """Simula al dueño del token y arma el header de autorización."""
    simulado = patch(
        "app.repositories.usuarios.UsuariosRepository.obtener_por_id",
        AsyncMock(return_value=usuario),
    )
    return simulado, {"Authorization": f"Bearer {seguridad.crear_token(usuario)}"}


def _todo_vacio() -> Any:
    """Todos los métodos del repositorio devuelven listas vacías."""
    return patch.multiple(
        REPO,
        **{metodo: AsyncMock(return_value=[]) for metodo in {**VENTAS, **STOCK}.values()},
    )


def test_sin_token_da_401(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/reportes/detalle-pedidos")
    assert respuesta.status_code == 401


@pytest.mark.parametrize(
    ("usuario", "permitidas", "prohibidas"),
    [
        (ADMIN, {**VENTAS, **STOCK}, {}),
        (VENDEDOR, VENTAS, STOCK),
        (DEPOSITO, STOCK, VENTAS),
    ],
    ids=["ADMIN", "VENDEDOR", "DEPOSITO"],
)
def test_permisos_por_rol(
    cliente: TestClient,
    usuario: dict[str, Any],
    permitidas: dict[str, str],
    prohibidas: dict[str, str],
) -> None:
    """Contrato: ADMIN todo, VENDEDOR reportes de ventas, DEPOSITO de stock."""
    simulado, header = _como(usuario)
    with simulado, _todo_vacio():
        for ruta in permitidas:
            respuesta = cliente.get(ruta, headers=header)
            assert respuesta.status_code == 200, ruta
            assert respuesta.json() == [], ruta
        for ruta in prohibidas:
            respuesta = cliente.get(ruta, headers=header)
            assert respuesta.status_code == 403, ruta
            assert respuesta.json()["error"]["code"] == "FORBIDDEN"


def test_sin_fechas_usa_el_mes_actual(cliente: TestClient) -> None:
    """Por defecto el rango es del 1 al último día del mes en curso."""
    simulado, header = _como(ADMIN)
    detalle = AsyncMock(return_value=[])
    with simulado, patch(f"{REPO}.detalle_pedidos", detalle):
        cliente.get("/api/reportes/detalle-pedidos", headers=header)
    hoy = date.today()
    ultimo_dia = calendar.monthrange(hoy.year, hoy.month)[1]
    assert detalle.await_args.args == (
        hoy.replace(day=1),
        hoy.replace(day=ultimo_dia),
    )


def test_las_fechas_llegan_al_repositorio(cliente: TestClient) -> None:
    simulado, header = _como(ADMIN)
    detalle = AsyncMock(return_value=[])
    with simulado, patch(f"{REPO}.detalle_pedidos", detalle):
        cliente.get(
            "/api/reportes/detalle-pedidos?desde=2026-08-01&hasta=2026-10-31",
            headers=header,
        )
    assert detalle.await_args.args == (date(2026, 8, 1), date(2026, 10, 31))


def test_desde_posterior_a_hasta_da_422(cliente: TestClient) -> None:
    simulado, header = _como(ADMIN)
    with simulado, _todo_vacio():
        respuesta = cliente.get(
            "/api/reportes/detalle-pedidos?desde=2026-10-31&hasta=2026-08-01",
            headers=header,
        )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["code"] == "VALIDATION_ERROR"


def test_fecha_mal_escrita_da_422(cliente: TestClient) -> None:
    simulado, header = _como(ADMIN)
    with simulado, _todo_vacio():
        respuesta = cliente.get(
            "/api/reportes/detalle-pedidos?desde=31-10-2026", headers=header
        )
    assert respuesta.status_code == 422


@pytest.mark.parametrize("consulta", ["dias=0", "dias=366"])
def test_dias_fuera_de_rango_da_422(cliente: TestClient, consulta: str) -> None:
    simulado, header = _como(ADMIN)
    with simulado, _todo_vacio():
        respuesta = cliente.get(
            f"/api/reportes/productos-sin-ventas?{consulta}", headers=header
        )
    assert respuesta.status_code == 422


def test_dias_y_limite_llegan_al_repositorio(cliente: TestClient) -> None:
    simulado, header = _como(ADMIN)
    sin_ventas = AsyncMock(return_value=[])
    ranking = AsyncMock(return_value=[])
    with simulado, patch(f"{REPO}.productos_sin_ventas", sin_ventas), patch(
        f"{REPO}.ranking_productos", ranking
    ):
        cliente.get("/api/reportes/productos-sin-ventas?dias=45", headers=header)
        cliente.get(
            "/api/reportes/ranking-productos?limite=3"
            "&desde=2026-08-01&hasta=2026-10-31",
            headers=header,
        )
    assert sin_ventas.await_args.args == (45,)
    assert ranking.await_args.args == (date(2026, 8, 1), date(2026, 10, 31), 3)


@pytest.mark.parametrize("limite", ["0", "51"])
def test_limite_fuera_de_rango_da_422(cliente: TestClient, limite: str) -> None:
    simulado, header = _como(ADMIN)
    with simulado, _todo_vacio():
        respuesta = cliente.get(
            f"/api/reportes/ranking-productos?limite={limite}", headers=header
        )
    assert respuesta.status_code == 422


def test_forma_de_ranking_segun_contrato(cliente: TestClient) -> None:
    simulado, header = _como(VENDEDOR)
    fila = {"producto_id": 14, "nombre": "Brahma 1L x12", "unidades": 51, "total": 1530000}
    with simulado, patch(f"{REPO}.ranking_productos", AsyncMock(return_value=[fila])):
        respuesta = cliente.get("/api/reportes/ranking-productos", headers=header)
    assert respuesta.status_code == 200
    assert respuesta.json() == [
        {"producto_id": 14, "nombre": "Brahma 1L x12", "unidades": 51, "total": 1530000.0}
    ]


def test_dashboard_forma_y_todos_los_roles(cliente: TestClient) -> None:
    """El dashboard lo ven los tres roles, con la forma del contrato."""
    resumen = {
        "ventas_mes": 4850000,
        "pedidos_pendientes": 7,
        "productos_bajo_minimo": 4,
        "clientes_activos": 12,
    }
    por_dia = [{"fecha": date(2026, 11, 1), "total": 320000}]
    for usuario in (ADMIN, VENDEDOR, DEPOSITO):
        simulado, header = _como(usuario)
        with simulado, patch(
            f"{REPO}.resumen_dashboard", AsyncMock(return_value=resumen)
        ), patch(f"{REPO}.ventas_por_dia", AsyncMock(return_value=por_dia)):
            respuesta = cliente.get("/api/dashboard", headers=header)
        assert respuesta.status_code == 200, usuario["rol"]
        assert respuesta.json() == {
            "ventas_mes": 4850000.0,
            "pedidos_pendientes": 7,
            "productos_bajo_minimo": 4,
            "clientes_activos": 12,
            "ventas_por_dia": [{"fecha": "2026-11-01", "total": 320000.0}],
        }
