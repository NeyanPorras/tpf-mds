"""Criterios clave del CRUD de clientes (revisión del PR de B4).

Simula la base como test_auth.py: no hace falta Docker ni MySQL.
Correr:  pytest tests/ -v
"""
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
    "password_hash": seguridad.hash_password("Admin123!"),
    "activo": True,
    "rol": "ADMIN",
}

DEPOSITO = {
    **ADMIN,
    "id": 3,
    "nombre": "Dami Deposito",
    "email": "deposito@distribuidora.com",
    "rol": "DEPOSITO",
}

CLIENTE = {
    "id": 1,
    "razon_social": "Almacen Don Pepe",
    "cuit": "20-28765432-1",
    "direccion": "San Martin 1234",
    "zona": "Centro",
    "telefono": "342-155667788",
}


def _app() -> TestClient:
    """App de producción con la conexión de base simulada."""
    app = crear_app()

    async def conexion_falsa() -> Any:
        yield None

    app.dependency_overrides[database.get_conexion] = conexion_falsa
    return TestClient(app)


@pytest.fixture()
def cliente() -> TestClient:
    """Cada test arranca con la app limpia (test_auth usa el mismo fixture)."""
    return _app()


def _con_usuario(usuario: dict[str, Any]) -> Any:
    """Simula la lectura del usuario dueño del token (verificar en seguridad)."""
    return patch(
        "app.repositories.usuarios.UsuariosRepository.obtener_por_id",
        AsyncMock(return_value=usuario),
    )


def _token(usuario: dict[str, Any]) -> str:
    return seguridad.crear_token(usuario)


def test_cuit_duplicado_da_409(cliente: TestClient) -> None:
    """El CUIT ya existe: 409 CONFLICT con la forma del contrato."""
    repositorio = "app.repositories.clientes.ClientesRepository"
    with _con_usuario(ADMIN), patch(
        f"{repositorio}.buscar_por_cuit",
        AsyncMock(return_value=CLIENTE),
    ):
        respuesta = cliente.post(
            "/api/clientes",
            headers={"Authorization": f"Bearer {_token(ADMIN)}"},
            json={
                "razon_social": "Otro cliente",
                "cuit": "20-28765432-1",
                "direccion": "Belgrano 1",
                "zona": "Sur",
            },
        )
    assert respuesta.status_code == 409
    cuerpo = respuesta.json()
    assert cuerpo["error"]["code"] == "CONFLICT"
    assert cuerpo["error"]["details"] == {"cliente": 1}


def test_deposito_no_puede_leer_clientes_403(cliente: TestClient) -> None:
    """DEPOSITO no tiene acceso a clientes ni para leer (403, no 401)."""
    with _con_usuario(DEPOSITO):
        respuesta = cliente.get(
            "/api/clientes", headers={"Authorization": f"Bearer {_token(DEPOSITO)}"}
        )
    assert respuesta.status_code == 403
    assert respuesta.json()["error"]["code"] == "FORBIDDEN"


def test_crear_cliente_da_201(cliente: TestClient) -> None:
    repositorio = "app.repositories.clientes.ClientesRepository"
    with _con_usuario(ADMIN), patch(
        f"{repositorio}.buscar_por_cuit",
        AsyncMock(return_value=None),
    ), patch(
        f"{repositorio}.crear",
        AsyncMock(return_value=1),
    ), patch(
        f"{repositorio}.obtener_por_id",
        AsyncMock(return_value=CLIENTE),
    ):
        respuesta = cliente.post(
            "/api/clientes",
            headers={"Authorization": f"Bearer {_token(ADMIN)}"},
            json={
                "razon_social": "Almacen Don Pepe",
                "cuit": "20-28765432-1",
                "direccion": "San Martin 1234",
                "zona": "Centro",
                "telefono": "342-155667788",
            },
        )
    assert respuesta.status_code == 201
    assert respuesta.json()["razon_social"] == "Almacen Don Pepe"


def test_put_telefono_null_lo_vacia(cliente: TestClient) -> None:
    """null explícito produce None: el teléfono queda vacío."""
    repositorio = "app.repositories.clientes.ClientesRepository"
    with _con_usuario(ADMIN), patch(
        f"{repositorio}.obtener_por_id", AsyncMock(return_value=CLIENTE)
    ), patch(f"{repositorio}.buscar_por_cuit", AsyncMock(return_value=None)), patch(
        f"{repositorio}.actualizar", AsyncMock()
    ) as actualizar:
        respuesta = cliente.put(
            "/api/clientes/1",
            headers={"Authorization": f"Bearer {_token(ADMIN)}"},
            json={"telefono": None},
        )
    assert respuesta.status_code == 200
    # repo.actualizar(id, razon_social, cuit, direccion, zona, telefono)
    assert actualizar.call_args.args[-1] is None


def test_put_sin_telefono_lo_mantiene(cliente: TestClient) -> None:
    """El campo ausente significa "no cambiar": el teléfono sigue igual."""
    repositorio = "app.repositories.clientes.ClientesRepository"
    with _con_usuario(ADMIN), patch(
        f"{repositorio}.obtener_por_id", AsyncMock(return_value=CLIENTE)
    ), patch(f"{repositorio}.buscar_por_cuit", AsyncMock(return_value=None)), patch(
        f"{repositorio}.actualizar", AsyncMock()
    ) as actualizar:
        respuesta = cliente.put(
            "/api/clientes/1",
            headers={"Authorization": f"Bearer {_token(ADMIN)}"},
            json={"zona": "Sur"},
        )
    assert respuesta.status_code == 200
    # repo.actualizar(id, razon_social, cuit, direccion, zona, telefono)
    assert actualizar.call_args.args[-1] == "342-155667788"


def test_put_cuit_null_da_422(cliente: TestClient) -> None:
    """Los campos no anulables rechazan null explícito con 422."""
    with _con_usuario(ADMIN), patch(
        "app.repositories.clientes.ClientesRepository.obtener_por_id",
        AsyncMock(return_value=CLIENTE),
    ):
        respuesta = cliente.put(
            "/api/clientes/1",
            headers={"Authorization": f"Bearer {_token(ADMIN)}"},
            json={"cuit": None},
        )
    assert respuesta.status_code == 422
    cuerpo = respuesta.json()
    assert cuerpo["error"]["code"] == "VALIDATION_ERROR"
    assert any(detalle["field"] == "cuit" for detalle in cuerpo["error"]["details"])
