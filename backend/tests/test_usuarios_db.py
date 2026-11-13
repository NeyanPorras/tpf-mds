"""Usuarios contra MySQL REAL: el ciclo completo y su efecto en el JWT.

Alta -> login con la contraseña nueva -> edición de rol (el token viejo
pasa a tener el permiso nuevo) -> desactivación (el login y el token dejan
de funcionar) -> reactivación.

Corre solo si la base está disponible. Al terminar borra el usuario de
prueba (no tiene pedidos ni movimientos, así que la FK lo permite).
"""
import asyncio
import socket
import uuid

import aiomysql
import pytest
from fastapi.testclient import TestClient

from app.core import database
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


async def _conectar() -> aiomysql.Connection:
    return await aiomysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        autocommit=True,
    )


@pytest.fixture(scope="module")
def cliente() -> TestClient:
    """Una conexión por request (aiomysql no comparte conexiones entre loops)."""
    app = crear_app()

    async def conexion_real():
        conn = await _conectar()
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[database.get_conexion] = conexion_real
    return TestClient(app)


def _ejecutar(sql: str, parametros: tuple) -> list[dict]:
    async def correr() -> list[dict]:
        conn = await _conectar()
        try:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(sql, parametros)
                return list(await cursor.fetchall())
        finally:
            conn.close()

    return asyncio.run(correr())


def _login(cliente: TestClient, email: str, password: str) -> tuple[int, str | None]:
    respuesta = cliente.post("/api/auth/login", json={"email": email, "password": password})
    token = respuesta.json().get("access_token") if respuesta.status_code == 200 else None
    return respuesta.status_code, token


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_ciclo_completo_de_un_usuario(cliente: TestClient) -> None:
    email = f"prueba-{uuid.uuid4().hex[:8]}@distribuidora.com"
    _, token_admin = _login(cliente, "admin@distribuidora.com", "Admin123!")
    assert token_admin, "el admin del seed tiene que poder loguearse"
    admin = _bearer(token_admin)
    id_nuevo = None
    try:
        # Alta: 201, sin hash en la respuesta y con bcrypt en la base.
        respuesta = cliente.post(
            "/api/usuarios",
            headers=admin,
            json={"nombre": "Usuario Prueba", "email": email, "password": "Prueba123", "rol": "DEPOSITO"},
        )
        assert respuesta.status_code == 201, respuesta.text
        creado = respuesta.json()
        id_nuevo = creado["id"]
        assert creado == {
            "id": id_nuevo,
            "nombre": "Usuario Prueba",
            "email": email,
            "rol": "DEPOSITO",
            "activo": True,
        }
        hash_guardado = _ejecutar("SELECT password_hash FROM usuarios WHERE id = %s", (id_nuevo,))
        assert hash_guardado[0]["password_hash"].startswith("$2")

        # Email repetido: 409 y no se crea otro.
        repetido = cliente.post(
            "/api/usuarios",
            headers=admin,
            json={"nombre": "Otro", "email": email, "password": "Prueba123", "rol": "VENDEDOR"},
        )
        assert repetido.status_code == 409
        assert len(_ejecutar("SELECT id FROM usuarios WHERE email = %s", (email,))) == 1

        # Aparece en el listado.
        listado = cliente.get("/api/usuarios", params={"size": 100}, headers=admin).json()
        assert id_nuevo in [u["id"] for u in listado["items"]]

        # Login con la contraseña nueva; como DEPOSITO no ve clientes.
        estado, token = _login(cliente, email, "Prueba123")
        assert estado == 200
        assert cliente.get("/api/clientes", headers=_bearer(token)).status_code == 403

        # Cambio de rol: el MISMO token ahora tiene permiso (el rol se lee de la base).
        editado = cliente.put(f"/api/usuarios/{id_nuevo}", headers=admin, json={"rol": "VENDEDOR"})
        assert editado.status_code == 200
        assert editado.json()["rol"] == "VENDEDOR"
        assert cliente.get("/api/clientes", headers=_bearer(token)).status_code == 200

        # Cambio de contraseña: la vieja deja de servir.
        assert cliente.put(
            f"/api/usuarios/{id_nuevo}", headers=admin, json={"password": "Cambiada456"}
        ).status_code == 200
        assert _login(cliente, email, "Prueba123")[0] == 401
        assert _login(cliente, email, "Cambiada456")[0] == 200

        # Desactivar: 204, no puede loguearse y su token deja de valer.
        assert cliente.delete(f"/api/usuarios/{id_nuevo}", headers=admin).status_code == 204
        assert _login(cliente, email, "Cambiada456")[0] == 401
        assert cliente.get("/api/auth/me", headers=_bearer(token)).status_code == 401
        assert cliente.get(f"/api/usuarios/{id_nuevo}", headers=admin).json()["activo"] is False

        # Reactivar con PUT.
        reactivado = cliente.put(f"/api/usuarios/{id_nuevo}", headers=admin, json={"activo": True})
        assert reactivado.json()["activo"] is True
        assert _login(cliente, email, "Cambiada456")[0] == 200
    finally:
        if id_nuevo is not None:
            _ejecutar("DELETE FROM usuarios WHERE id = %s", (id_nuevo,))
