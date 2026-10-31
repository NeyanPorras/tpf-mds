"""Bug de B1: el pool se recupera solo aunque MySQL no esté al arrancar.

También cubre el contrato: el 503 no expone detalles de MySQL (van al log).
Los tests simulan la conexión; no hace falta MySQL.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core import database
from app.core.exceptions import ApiError


@pytest.fixture(autouse=True)
def pool_limpio() -> None:
    """Ningún test deja un pool falso colgado en el singleton."""
    database.Database.pool = None
    yield
    database.Database.pool = None


def test_recuperar_pool_exito_deja_pool_listo() -> None:
    pool_falso = MagicMock()
    with patch(
        "app.core.database.aiomysql.create_pool", AsyncMock(return_value=pool_falso)
    ):
        asyncio.run(database.recuperar_pool())
    assert database.Database.pool is pool_falso


def test_recuperar_pool_fallo_da_503_sin_detalles_de_mysql() -> None:
    with patch(
        "app.core.database.aiomysql.create_pool",
        AsyncMock(side_effect=ConnectionRefusedError("winerror 10061")),
    ):
        with pytest.raises(ApiError) as error:
            asyncio.run(database.recuperar_pool())
    assert error.value.estado_http == 503
    assert error.value.detalle is None  # el detalle solo va al log


def test_get_conexion_reintenta_cuando_pool_es_none() -> None:
    """Sin pool, el request de todos modos intenta crearlo (recuperación)."""
    conexion_falsa = object()
    pool_falso = MagicMock()
    pool_falso.acquire.return_value.__aenter__.return_value = conexion_falsa
    with patch(
        "app.core.database.aiomysql.create_pool", AsyncMock(return_value=pool_falso)
    ):

        async def primero() -> object:
            generador = database.get_conexion()
            return await generador.__anext__()

        assert asyncio.run(primero()) is conexion_falsa


def test_conectar_no_duplica_pool_si_ya_existe() -> None:
    """Si dos requests crean el pool a la vez, el ganador queda y el otro cierra."""
    pool_existente = MagicMock()
    pool_en_curso = MagicMock()
    pool_en_curso.wait_closed = AsyncMock()
    database.Database.pool = pool_existente
    with patch(
        "app.core.database.aiomysql.create_pool", AsyncMock(return_value=pool_en_curso)
    ):
        asyncio.run(database.conectar())
    assert database.Database.pool is pool_existente
    pool_en_curso.close.assert_called_once()
