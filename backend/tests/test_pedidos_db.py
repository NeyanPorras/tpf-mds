"""Pedidos contra MySQL REAL: los dos criterios "Terminada cuando".

- Crear un pedido PENDIENTE sin stock y confirmarlo -> 409 STOCK_INSUFICIENTE
  con el nombre del producto y el detalle solicitado/disponible.
- Confirmar un pedido válido -> pasa de PENDIENTE a CONFIRMADO y baja el stock.

Corre solo si la base está disponible (Docker o la instancia local del
README, con DB_HOST/DB_PORT del .env). Si no hay base, se salta el módulo.

Gasta la base de desarrollo: cada corrida confirma unos cuantos pedidos
de prueba (los descuenta del stock de un producto, como en el uso real).
"""
import asyncio
import socket
from typing import Any

import aiomysql
import pytest
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.core.config import settings
from app.main import crear_app

# Si la base no responde, todo este módulo se salta (no es error de tests).
try:
    _socket = socket.create_connection((settings.DB_HOST, settings.DB_PORT), timeout=2)
    _socket.close()
except OSError:
    pytest.skip(
        f"MySQL no está disponible en {settings.DB_HOST}:{settings.DB_PORT}",
        allow_module_level=True,
    )

VENDEDOR = {
    "id": 2,
    "nombre": "Valen Vendedor",
    "email": "ventas@distribuidora.com",
    "password_hash": "x",
    "activo": True,
    "rol": "VENDEDOR",
}
DEPOSITO = {
    "id": 3,
    "nombre": "Dami Deposito",
    "email": "deposito@distribuidora.com",
    "password_hash": "x",
    "activo": True,
    "rol": "DEPOSITO",
}

# Producto del seed con stock suficiente para las corridas (id=2):
# su nombre real en el seed del equipo es "Coca-Cola Zero 2.25L x6".
PRODUCTO_FIJO = 2


def _header(usuario: dict) -> dict:
    token = seguridad.crear_token(usuario)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def cliente() -> TestClient:
    """App en la que cada request abre su propia conexión MySQL.

    En lugar del pool: aiomysql no permite reutilizar conexiones entre
    event loops distintos (cada request de TestClient corre en el suyo),
    así que la conexión se crea y se cierra dentro del mismo request.
    """
    app = crear_app()

    async def conexion_real():
        conn = await aiomysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
            autocommit=True,  # las transacciones son del SP
        )
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[database.get_conexion] = conexion_real
    return TestClient(app)


def _consultar(sql: str, parametros: tuple) -> list[dict[str, Any]]:
    """SELECT directo, con conexión propia (genérico para asserts)."""

    async def consultar() -> list[dict[str, Any]]:
        conn = await aiomysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
        )
        try:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(sql, parametros)
                filas: list[dict[str, Any]] = await cursor.fetchall()
                return filas
        finally:
            conn.close()

    return asyncio.run(consultar())


def _stock() -> int:
    filas = _consultar("SELECT stock FROM productos WHERE id = %s", (PRODUCTO_FIJO,))
    return filas[0]["stock"]


def test_confirmar_sin_stock_devuelve_409_con_nombre(cliente: TestClient) -> None:
    """Criterio de la tarea: sin stock -> 409 con el nombre del producto."""
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={
            "cliente_id": 1,
            "lineas": [{"producto_id": PRODUCTO_FIJO, "cantidad": 5_000}],
        },
    )
    assert respuesta.status_code == 201
    id_pedido = respuesta.json()["id"]

    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 409
    cuerpo = respuesta.json()["error"]
    assert cuerpo["code"] == "STOCK_INSUFICIENTE"
    assert "No hay stock suficiente de" in cuerpo["message"]
    # Con el nombre REAL del producto, no con el genérico del fallback.
    assert cuerpo["message"] != "No hay stock suficiente de un producto"
    assert cuerpo["details"]["producto_id"] == PRODUCTO_FIJO
    assert cuerpo["details"]["solicitado"] == 5_000
    assert cuerpo["details"]["disponible"] >= 0

    # El SP deshace todo: el pedido sigue PENDIENTE y se cancela al final.
    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/cancelar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CANCELADO"


def test_confirmar_cambia_el_estado_y_descuenta_stock(cliente: TestClient) -> None:
    """Criterio de la tarea: confirmado cambia a CONFIRMADO (y baja el stock)."""
    stock_antes = _stock()

    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={
            "cliente_id": 1,
            "lineas": [{"producto_id": PRODUCTO_FIJO, "cantidad": 1}],
        },
    )
    assert respuesta.status_code == 201
    id_pedido = respuesta.json()["id"]
    assert respuesta.json()["estado"] == "PENDIENTE"
    assert respuesta.json()["total"] == 0  # el total se calcula al confirmar

    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "CONFIRMADO"
    assert cuerpo["total"] == cuerpo["lineas"][0]["subtotal"]
    assert cuerpo["lineas"][0]["producto"]["id"] == PRODUCTO_FIJO
    assert cuerpo["lineas"][0]["precio_unitario"] > 0

    assert _stock() == stock_antes - 1  # el SP descontó exactamente 1


def test_pedido_confirmado_no_se_vuelve_a_confirmar(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={
            "cliente_id": 1,
            "lineas": [{"producto_id": PRODUCTO_FIJO, "cantidad": 1}],
        },
    )
    id_pedido = respuesta.json()["id"]
    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 200
    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "ESTADO_INVALIDO"


def test_confirmado_lo_entrega_deposito(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={
            "cliente_id": 1,
            "lineas": [{"producto_id": PRODUCTO_FIJO, "cantidad": 1}],
        },
    )
    id_pedido = respuesta.json()["id"]
    cliente.post(f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR))

    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/entregar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 403  # el vendedor no entrega; lo hace DEPOSITO

    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/entregar", headers=_header(DEPOSITO)
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ENTREGADO"


# ------------------------------------------------------------------
# Editar líneas de un PENDIENTE (PUT /pedidos/{id}) contra MySQL real
# ------------------------------------------------------------------

OTRO_PRODUCTO = 5


def _precio(producto_id: int) -> float:
    filas = _consultar("SELECT precio FROM productos WHERE id = %s", (producto_id,))
    return float(filas[0]["precio"])


def _crear_pendiente(cliente: TestClient, producto_id: int, cantidad: int) -> int:
    respuesta = cliente.post(
        "/api/pedidos",
        headers=_header(VENDEDOR),
        json={
            "cliente_id": 1,
            "lineas": [{"producto_id": producto_id, "cantidad": cantidad}],
        },
    )
    assert respuesta.status_code == 201
    return respuesta.json()["id"]


def test_editar_reemplaza_lineas_y_copia_el_precio(cliente: TestClient) -> None:
    id_pedido = _crear_pendiente(cliente, PRODUCTO_FIJO, 1)

    respuesta = cliente.put(
        f"/api/pedidos/{id_pedido}",
        headers=_header(VENDEDOR),
        json={"lineas": [{"producto_id": OTRO_PRODUCTO, "cantidad": 2}]},
    )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    # La cabecera no cambió; las líneas sí.
    assert cuerpo["id"] == id_pedido
    assert cuerpo["estado"] == "PENDIENTE"
    assert cuerpo["total"] == 0  # el total sigue calculándose al confirmar
    assert cuerpo["cliente"]["id"] == 1
    assert len(cuerpo["lineas"]) == 1
    linea = cuerpo["lineas"][0]
    assert linea["producto"]["id"] == OTRO_PRODUCTO
    assert linea["cantidad"] == 2
    assert linea["precio_unitario"] == _precio(OTRO_PRODUCTO)
    assert linea["subtotal"] == linea["precio_unitario"] * 2

    # En la base quedó una sola línea, con el producto nuevo.
    filas = _consultar(
        "SELECT producto_id, cantidad FROM detalle_pedido WHERE pedido_id = %s",
        (id_pedido,),
    )
    assert filas == [{"producto_id": OTRO_PRODUCTO, "cantidad": 2}]

    # Limpieza: el pedido sigue PENDIENTE y se cancela.
    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/cancelar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CANCELADO"


def test_editar_pedido_confirmado_da_409(cliente: TestClient) -> None:
    id_pedido = _crear_pendiente(cliente, PRODUCTO_FIJO, 1)
    cliente.post(f"/api/pedidos/{id_pedido}/confirmar", headers=_header(VENDEDOR))

    respuesta = cliente.put(
        f"/api/pedidos/{id_pedido}",
        headers=_header(VENDEDOR),
        json={"lineas": [{"producto_id": OTRO_PRODUCTO, "cantidad": 2}]},
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "ESTADO_INVALIDO"

    # Las líneas del pedido confirmado no se tocaron.
    filas = _consultar(
        "SELECT producto_id FROM detalle_pedido WHERE pedido_id = %s", (id_pedido,)
    )
    assert filas == [{"producto_id": PRODUCTO_FIJO}]


def test_editar_pedido_inexistente_da_404(cliente: TestClient) -> None:
    respuesta = cliente.put(
        "/api/pedidos/999999",
        headers=_header(VENDEDOR),
        json={"lineas": [{"producto_id": PRODUCTO_FIJO, "cantidad": 1}]},
    )
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["code"] == "NOT_FOUND"


def test_editar_con_producto_repetido_da_409(cliente: TestClient) -> None:
    id_pedido = _crear_pendiente(cliente, PRODUCTO_FIJO, 1)

    respuesta = cliente.put(
        f"/api/pedidos/{id_pedido}",
        headers=_header(VENDEDOR),
        json={
            "lineas": [
                {"producto_id": OTRO_PRODUCTO, "cantidad": 1},
                {"producto_id": OTRO_PRODUCTO, "cantidad": 3},
            ]
        },
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["message"].startswith(
        "Los productos no se pueden repetir"
    )

    # El pedido original quedó intacto y se puede cancelar.
    respuesta = cliente.post(
        f"/api/pedidos/{id_pedido}/cancelar", headers=_header(VENDEDOR)
    )
    assert respuesta.status_code == 200
