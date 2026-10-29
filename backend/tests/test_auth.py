"""Criterios de la tarea B2: sin token 401, rol sin permiso 403, token vencido 401.

Los tests simulan la base (no hacen falta Docker ni MySQL instalados).
Correr:  pip install -r requirements-dev.txt
         pytest tests/ -v
"""
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import database, seguridad
from app.main import crear_app
from app.schemas.auth import LoginEntrada

USUARIO_ACTIVO = {
    "id": 1,
    "nombre": "Ana Admin",
    "email": "admin@distribuidora.com",
    "password_hash": seguridad.hash_password("Admin123!"),
    "activo": True,
    "rol": "ADMIN",
}


def _app() -> FastAPI:
    """La app de producción, con la conexión de base simulada y /solo-admin.

    `solo-admin` ejemplifica cómo usan require_role los routers protegidos
    por rol (los endpoints de /usuarios de la tarea B5 la usan así).
    """
    app = crear_app()

    @app.get("/api/solo-admin")
    async def solo_admin(
        usuario: dict = Depends(seguridad.require_role("ADMIN")),
    ) -> dict:
        return {"ok": True, "rol": usuario["rol"]}

    async def conexion_falsa() -> Any:
        yield None

    app.dependency_overrides[database.get_conexion] = conexion_falsa
    return app


@pytest.fixture()
def cliente() -> TestClient:
    return TestClient(_app())


# ------------------------------------------------------------------
# 1. Sin token -> 401
# ------------------------------------------------------------------

def test_sin_token_da_401(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/auth/me")
    assert respuesta.status_code == 401
    cuerpo = respuesta.json()
    assert cuerpo["error"]["code"] == "UNAUTHORIZED"
    assert cuerpo["error"]["message"] == "No autenticado."


def test_header_mal_formado_da_401(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/auth/me", headers={"Authorization": "Basic abc"})
    assert respuesta.status_code == 401


# ------------------------------------------------------------------
# 2. Rol sin permiso -> 403
# ------------------------------------------------------------------

from fastapi import Depends, FastAPI


def test_vendedor_sin_permiso_da_403(cliente: TestClient) -> None:
    vendedor = {**USUARIO_ACTIVO, "rol": "VENDEDOR", "id": 2}
    token = seguridad.crear_token(vendedor)
    with patch(
        "app.repositories.usuarios.UsuariosRepository.obtener_por_id",
        AsyncMock(return_value=vendedor),
    ):
        respuesta = cliente.get(
            "/api/solo-admin", headers={"Authorization": f"Bearer {token}"}
        )
    assert respuesta.status_code == 403
    cuerpo = respuesta.json()
    assert cuerpo["error"]["code"] == "FORBIDDEN"
    assert cuerpo["error"]["message"] == "El rol no tiene permiso para esta acción."


def test_admin_con_permiso_pasa(cliente: TestClient) -> None:
    token = seguridad.crear_token(USUARIO_ACTIVO)
    with patch(
        "app.repositories.usuarios.UsuariosRepository.obtener_por_id",
        AsyncMock(return_value=USUARIO_ACTIVO),
    ):
        respuesta = cliente.get(
            "/api/solo-admin", headers={"Authorization": f"Bearer {token}"}
        )
    assert respuesta.status_code == 200
    assert respuesta.json()["rol"] == "ADMIN"


def test_403_no_es_401_sin_token(cliente: TestClient) -> None:
    """Los errores se distinguen: sin token es 401, con token y sin rol es 403."""
    respuesta = cliente.get("/api/solo-admin")
    assert respuesta.status_code == 401


# ------------------------------------------------------------------
# 3. El token vence -> 401
# ------------------------------------------------------------------

def _token_con_exp(exp: datetime) -> str:
    """JWT firmado con una exp arbitraria (para simular tokens vencidos)."""
    import jwt

    from app.core.config import settings

    return jwt.encode(
        {"sub": "1", "rol": "ADMIN", "exp": exp},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def test_token_vencido_da_401_y_no_pasa(cliente: TestClient) -> None:
    """Un token emitido hace más de JWT_EXPIRE_MINUTES ya no sirve."""
    vencido = _token_con_exp(datetime.now(timezone.utc) - timedelta(minutes=1))
    with patch(
        "app.repositories.usuarios.UsuariosRepository.obtener_por_id",
        AsyncMock(return_value=USUARIO_ACTIVO),
    ):
        respuesta = cliente.get("/api/auth/me", headers={"Authorization": f"Bearer {vencido}"})
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["message"] == "Token inválido o vencido."


def test_expires_in_coincide_con_la_config() -> None:
    """Lo que se anuncia en expires_in es lo que el token realmente vale."""
    import jwt

    from app.core.config import settings

    token = seguridad.crear_token(USUARIO_ACTIVO)
    claims: dict[str, Any] = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    segundos = claims["exp"] - claims["iat"]
    assert segundos == pytest.approx(settings.JWT_EXPIRE_MINUTES * 60, abs=2)


# ------------------------------------------------------------------
# Bonus: login
# ------------------------------------------------------------------

def test_login_correcto(cliente: TestClient) -> None:
    with patch(
        "app.repositories.usuarios.UsuariosRepository.buscar_por_email",
        AsyncMock(return_value=USUARIO_ACTIVO),
    ):
        respuesta = cliente.post(
            "/api/auth/login",
            json={"email": "admin@distribuidora.com", "password": "Admin123!"},
        )
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["token_type"] == "bearer"
    assert cuerpo["usuario"]["rol"] == "ADMIN"


def test_login_mal_password_da_401(cliente: TestClient) -> None:
    with patch(
        "app.repositories.usuarios.UsuariosRepository.buscar_por_email",
        AsyncMock(return_value=USUARIO_ACTIVO),
    ):
        respuesta = cliente.post(
            "/api/auth/login",
            json={"email": "admin@distribuidora.com", "password": "mal"},
        )
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["message"] == seguridad.CREDENCIALES_INVALIDAS
