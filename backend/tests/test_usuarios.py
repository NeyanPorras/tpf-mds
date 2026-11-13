"""Reglas del CRUD de usuarios (solo ADMIN) sin base de datos.

Simula la base como test_clientes.py: no hace falta Docker ni MySQL.
Correr:  pytest tests/ -v
"""
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.main import crear_app

REPO = "app.repositories.usuarios.UsuariosRepository"

ADMIN = {
    "id": 1,
    "nombre": "Ana Admin",
    "email": "admin@distribuidora.com",
    "password_hash": seguridad.hash_password("Admin123!"),
    "activo": True,
    "rol": "ADMIN",
}
VENDEDOR = {
    **ADMIN,
    "id": 2,
    "nombre": "Valen Vendedor",
    "email": "ventas@distribuidora.com",
    "rol": "VENDEDOR",
}

NUEVO = {
    "nombre": "Nico Nuevo",
    "email": "nico@distribuidora.com",
    "password": "Nuevo1234",
    "rol": "DEPOSITO",
}


@pytest.fixture()
def cliente() -> TestClient:
    app = crear_app()

    async def conexion_falsa() -> Any:
        yield None

    app.dependency_overrides[database.get_conexion] = conexion_falsa
    return TestClient(app)


def _header(usuario: dict[str, Any]) -> dict[str, str]:
    return {"Authorization": f"Bearer {seguridad.crear_token(usuario)}"}


def _usuario_actual(usuario: dict[str, Any]) -> Any:
    """El dueño del token: lo lee get_current_user con obtener_por_id."""
    return patch(f"{REPO}.obtener_por_id", AsyncMock(return_value=usuario))


def test_sin_token_da_401(cliente: TestClient) -> None:
    assert cliente.get("/api/usuarios").status_code == 401


@pytest.mark.parametrize(
    "metodo, ruta",
    [
        ("get", "/api/usuarios"),
        ("get", "/api/usuarios/1"),
        ("post", "/api/usuarios"),
        ("put", "/api/usuarios/1"),
        ("delete", "/api/usuarios/1"),
    ],
)
def test_otro_rol_que_admin_da_403(cliente: TestClient, metodo: str, ruta: str) -> None:
    with _usuario_actual(VENDEDOR):
        respuesta = cliente.request(metodo, ruta, headers=_header(VENDEDOR), json=NUEVO)
    assert respuesta.status_code == 403
    assert respuesta.json()["error"]["code"] == "FORBIDDEN"


def test_listado_nunca_devuelve_el_hash(cliente: TestClient) -> None:
    with _usuario_actual(ADMIN), patch(
        f"{REPO}.listar", AsyncMock(return_value=[ADMIN, VENDEDOR])
    ), patch(f"{REPO}.contar", AsyncMock(return_value=2)):
        respuesta = cliente.get("/api/usuarios", headers=_header(ADMIN))
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 2
    assert [u["email"] for u in cuerpo["items"]] == [ADMIN["email"], VENDEDOR["email"]]
    assert all("password_hash" not in u and "password" not in u for u in cuerpo["items"])
    assert cuerpo["items"][0] == {
        "id": 1,
        "nombre": "Ana Admin",
        "email": "admin@distribuidora.com",
        "rol": "ADMIN",
        "activo": True,
    }


@pytest.mark.parametrize(
    "cambio, campo",
    [
        ({"password": "corta1"}, "password"),
        ({"password": "sinnumeros"}, "password"),
        ({"email": "no-es-un-email"}, "email"),
        ({"rol": "SUPERUSUARIO"}, "rol"),
        ({"nombre": "A"}, "nombre"),
    ],
)
def test_alta_invalida_da_422(cliente: TestClient, cambio: dict, campo: str) -> None:
    with _usuario_actual(ADMIN):
        respuesta = cliente.post(
            "/api/usuarios", headers=_header(ADMIN), json={**NUEVO, **cambio}
        )
    assert respuesta.status_code == 422
    assert campo in [d["field"] for d in respuesta.json()["error"]["details"]]


def test_alta_con_email_repetido_da_409(cliente: TestClient) -> None:
    with _usuario_actual(ADMIN), patch(
        f"{REPO}.buscar_por_email", AsyncMock(return_value=VENDEDOR)
    ), patch(f"{REPO}.crear", AsyncMock()) as crear:
        respuesta = cliente.post(
            "/api/usuarios",
            headers=_header(ADMIN),
            json={**NUEVO, "email": VENDEDOR["email"]},
        )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"] == "CONFLICT"
    crear.assert_not_awaited()


def test_alta_guarda_la_contraseña_hasheada(cliente: TestClient) -> None:
    creado = {**NUEVO, "id": 9, "activo": True, "password_hash": "h"}
    del creado["password"]
    lecturas = AsyncMock(side_effect=[ADMIN, creado])
    with patch(f"{REPO}.obtener_por_id", lecturas), patch(
        f"{REPO}.buscar_por_email", AsyncMock(return_value=None)
    ), patch(f"{REPO}.id_de_rol", AsyncMock(return_value=3)), patch(
        f"{REPO}.crear", AsyncMock(return_value=9)
    ) as crear:
        respuesta = cliente.post("/api/usuarios", headers=_header(ADMIN), json=NUEVO)
    assert respuesta.status_code == 201
    assert respuesta.json()["id"] == 9
    nombre, email, hash_guardado, rol_id = crear.await_args.args
    assert (nombre, email, rol_id) == ("Nico Nuevo", "nico@distribuidora.com", 3)
    assert hash_guardado != NUEVO["password"]
    assert seguridad.verificar_password(NUEVO["password"], hash_guardado)


def test_admin_no_puede_desactivarse_a_si_mismo(cliente: TestClient) -> None:
    with _usuario_actual(ADMIN), patch(f"{REPO}.desactivar", AsyncMock()) as desactivar:
        respuesta = cliente.delete("/api/usuarios/1", headers=_header(ADMIN))
    assert respuesta.status_code == 409
    desactivar.assert_not_awaited()


@pytest.mark.parametrize("cambio", [{"rol": "VENDEDOR"}, {"activo": False}])
def test_admin_no_puede_quitarse_el_acceso(cliente: TestClient, cambio: dict) -> None:
    with _usuario_actual(ADMIN), patch(f"{REPO}.actualizar", AsyncMock()) as actualizar:
        respuesta = cliente.put("/api/usuarios/1", headers=_header(ADMIN), json=cambio)
    assert respuesta.status_code == 409
    actualizar.assert_not_awaited()


def test_usuario_inexistente_da_404(cliente: TestClient) -> None:
    lecturas = AsyncMock(side_effect=[ADMIN, None])
    with patch(f"{REPO}.obtener_por_id", lecturas):
        respuesta = cliente.delete("/api/usuarios/99", headers=_header(ADMIN))
    assert respuesta.status_code == 404
