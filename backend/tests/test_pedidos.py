"""Pedidos: validaciones de negocio y mapeo de los errores del SP.

La capa HTTP y el repositorio se simulan con parches; el flujo real contra
MySQL está en test_pedidos_db.py.
Correr:  pytest tests/ -v
"""
from unittest.mock import AsyncMock, patch

import aiomysql
import pytest
from fastapi import Security
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.core.exceptions import ApiError
from app.main import crear_app

VENDEDOR = {
    "id": 2,
    "nombre": "Valen Vendedor",
    "email": "ventas@distribuidora.com",
    "activo": True,
    "rol": "VENDEDOR",
}
DEPOSITO = {
    "id": 3,
    "nombre": "Dami Deposito",
    "email": "deposito@distribuidora.com",
    "activo": True,
    "rol": "DEPOSITO",
}


@pytest.fixture()
def cliente() -> TestClient:
    app = crear_app()

    async def token_a_usuario(credenciales=Security(seguridad.esquema_bearer)):
        """Los tests de negocio no consultan usuarios: decodifican el token."""
        if credenciales is None:
            raise ApiError(estado_http=401, mensaje="No autenticado.")
        claims = seguridad.decodificar_token(credenciales.credentials)
        return {"id": int(claims["sub"]), "rol": claims["rol"]}

    async def conexion_falsa():
        yield None

    app.dependency_overrides[database.get_conexion] = conexion_falsa
    app.dependency_overrides[seguridad.get_current_user] = token_a_usuario
    return TestClient(app)


def _header(usuario: dict) -> dict:
    token = seguridad.crear_token(usuario)
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------
# Crear PENDIENTE
# ------------------------------------------------------------------

def test_crear_con_cliente_inexistente_da_404(cliente: TestClient) -> None:
    with patch(
        "app.repositories.clientes.ClientesRepository.obtener_por_id",
        AsyncMock(return_value=None),
    ):
        respuesta = cliente.post(
            "/api/pedidos",
            headers=_header(VENDEDOR),
            json={"cliente_id": 999, "lineas": [{"producto_id": 2, "cantidad": 1}]},
        )
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["code"] == "NOT_FOUND"


def test_crear_con_producto_inexistente_da_404(cliente: TestClient) -> None:
    with patch(
        "app.repositories.clientes.ClientesRepository.obtener_por_id",
        AsyncMock(return_value={"id": 1}),
    ), patch(
        "app.repositories.pedidos.PedidosRepository.obtener_precios",
        AsyncMock(return_value={}),
    ):
        respuesta = cliente.post(
            "/api/pedidos",
            headers=_header(VENDEDOR),
            json={"cliente_id": 1, "lineas": [{"producto_id": 9999, "cantidad": 1}]},
        )
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["details"]["productos"] == [9999]


def test_crear_con_producto_repetido_da_409(cliente: TestClient) -> None:
    precios = {2: {"id": 2, "nombre": "x", "presentacion": "y", "precio": 800}}
    with patch(
        "app.repositories.clientes.ClientesRepository.obtener_por_id",
        AsyncMock(return_value={"id": 1}),
    ), patch(
        "app.repositories.pedidos.PedidosRepository.obtener_precios",
        AsyncMock(return_value=precios),
    ):
        respuesta = cliente.post(
            "/api/pedidos",
            headers=_header(VENDEDOR),
            json={
                "cliente_id": 1,
                "lineas": [
                    {"producto_id": 2, "cantidad": 1},
                    {"producto_id": 2, "cantidad": 3},
                ],
            },
        )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["message"].startswith(
        "Los productos no se pueden repetir"
    )


def test_crear_sin_lineas_da_422(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos", headers=_header(VENDEDOR), json={"cliente_id": 1, "lineas": []}
    )
    assert respuesta.status_code == 422


def test_crear_con_cantidad_cero_da_422(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={"cliente_id": 1, "lineas": [{"producto_id": 2, "cantidad": 0}]},
    )
    assert respuesta.status_code == 422


# ------------------------------------------------------------------
# Confirmar: mapeo de los mensajes que señala el SP
# (pymysql no respeta el MYSQL_ERRNO del SIGNAL: mapea por MESSAGE_TEXT)
# ------------------------------------------------------------------

def _simular_sp(mensaje: str):
    """Patchea el repositorio para que CALL relance el error del SP."""
    return (
        patch(
            "app.repositories.pedidos.PedidosRepository.obtener_estado",
            AsyncMock(return_value="PENDIENTE"),
        ),
        patch(
            "app.repositories.pedidos.PedidosRepository.llamar_sp_confirmar",
            AsyncMock(side_effect=aiomysql.MySQLError(1000, mensaje)),
        ),
    )


def test_confirmar_sin_stock_da_409_con_nombre_y_detalle(cliente: TestClient) -> None:
    parches = _simular_sp(
        "No hay stock suficiente de Cerveza Quilmes Clásica 473ml lata x24"
    )
    with parches[0], parches[1], patch(
        "app.repositories.pedidos.PedidosRepository.obtener_faltante",
        AsyncMock(
            return_value={
                "producto_id": 13,
                "solicitado": 26,
                "disponible": 3,
                "nombre": "Cerveza Quilmes Clásica 473ml lata x24",
            }
        ),
    ):
        respuesta = cliente.post("/api/pedidos/40/confirmar", headers=_header(VENDEDOR))
    assert respuesta.status_code == 409
    cuerpo = respuesta.json()["error"]
    assert cuerpo["code"] == "STOCK_INSUFICIENTE"
    assert "No hay stock suficiente de Cerveza Quilmes" in cuerpo["message"]
    assert cuerpo["details"]["producto_id"] == 13
    assert cuerpo["details"]["solicitado"] == 26
    assert cuerpo["details"]["disponible"] == 3


def test_confirmar_pedido_inexistente_da_404(cliente: TestClient) -> None:
    with patch(
        "app.repositories.pedidos.PedidosRepository.obtener_estado",
        AsyncMock(return_value=None),
    ):
        respuesta = cliente.post(
            "/api/pedidos/999/confirmar", headers=_header(VENDEDOR)
        )
    assert respuesta.status_code == 404


def test_confirmar_pedido_no_pendiente_da_409_estado_invalido(
    cliente: TestClient,
) -> None:
    parches = _simular_sp(
        "Solo se puede confirmar un pedido PENDIENTE (estado actual: CONFIRMADO)"
    )
    with parches[0], parches[1]:
        respuesta = cliente.post(
            "/api/pedidos/33/confirmar", headers=_header(VENDEDOR)
        )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "ESTADO_INVALIDO"


def test_confirmar_pedido_sin_lineas_da_400(cliente: TestClient) -> None:
    parches = _simular_sp("El pedido no tiene lineas")
    with parches[0], parches[1]:
        respuesta = cliente.post("/api/pedidos/1/confirmar", headers=_header(VENDEDOR))
    assert respuesta.status_code == 400


def test_confirmar_con_usuario_inactivo_da_400(cliente: TestClient) -> None:
    parches = _simular_sp("El usuario que confirma no existe o esta inactivo")
    with parches[0], parches[1]:
        respuesta = cliente.post("/api/pedidos/1/confirmar", headers=_header(VENDEDOR))
    assert respuesta.status_code == 400


# ------------------------------------------------------------------
# Cancelar y entregar: transiciones no permitidas
# ------------------------------------------------------------------

def _estado(estado: str | None):
    return patch(
        "app.repositories.pedidos.PedidosRepository.obtener_estado",
        AsyncMock(return_value=estado),
    )


def _cabecera(estado: str):
    return (
        patch(
            "app.repositories.pedidos.PedidosRepository.obtener_cabecera",
            AsyncMock(
                return_value={
                    "id": 1,
                    "fecha": "2026-10-27 08:30:00",
                    "estado": estado,
                    "total": 0,
                    "cliente_id": 1,
                    "cliente_razon_social": "Almacén Don Pepe",
                    "vendedor_id": 2,
                    "vendedor_nombre": "Valen Vendedor",
                }
            ),
        ),
        patch(
            "app.repositories.pedidos.PedidosRepository.listar_lineas",
            AsyncMock(return_value=[]),
        ),
    )


def test_cancelar_pedido_confirmado_da_409(cliente: TestClient) -> None:
    parches = _cabecera("CONFIRMADO")
    with _estado("CONFIRMADO"), parches[0], parches[1]:
        respuesta = cliente.post("/api/pedidos/1/cancelar", headers=_header(VENDEDOR))
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "ESTADO_INVALIDO"


def test_entregar_pedido_pendiente_da_409(cliente: TestClient) -> None:
    parches = _cabecera("PENDIENTE")
    with _estado("PENDIENTE"), parches[0], parches[1]:
        respuesta = cliente.post(
            "/api/pedidos/1/entregar", headers=_header(DEPOSITO)
        )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "ESTADO_INVALIDO"


# ------------------------------------------------------------------
# Roles del contrato
# ------------------------------------------------------------------

def test_deposito_no_puede_crear_pedidos(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(DEPOSITO),
        json={"cliente_id": 1, "lineas": [{"producto_id": 2, "cantidad": 1}]},
    )
    assert respuesta.status_code == 403
    assert respuesta.json()["error"]["code"] == "FORBIDDEN"


def test_deposito_no_puede_confirmar(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos/1/confirmar", headers=_header(DEPOSITO)
    )
    assert respuesta.status_code == 403


def test_vendedor_puede_listar_pedidos(cliente: TestClient) -> None:
    with patch(
        "app.repositories.pedidos.PedidosRepository.listar",
        AsyncMock(return_value=[]),
    ), patch(
        "app.repositories.pedidos.PedidosRepository.contar",
        AsyncMock(return_value=0),
    ):
        respuesta = cliente.get("/api/pedidos", headers=_header(VENDEDOR))
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["items"] == [] and cuerpo["total"] == 0


def test_sin_token_da_401_en_pedidos(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/pedidos")
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["code"] == "UNAUTHORIZED"
