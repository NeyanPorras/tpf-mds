"""Pool de conexiones ASÍNCRONO a MySQL (aiomysql)."""
import logging
from typing import AsyncIterator

import aiomysql

from app.core.config import settings
from app.core.exceptions import ApiError

logger = logging.getLogger("uvicorn.error")


class Database:
    pool: aiomysql.Pool | None = None


async def conectar() -> None:
    """Crea el pool. Si otro intento ya lo creó, descarta el sobrante.

    Los requests pueden llegar de a varios mientras la base vuelve:
    el primero que termine gana y los demás cierran su pool extra.
    """
    pool = await aiomysql.create_pool(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        charset="utf8mb4",
        autocommit=True,   # las transacciones críticas viven dentro de los SP
        minsize=1,
        maxsize=10,
    )
    if Database.pool is None:
        Database.pool = pool
    else:
        pool.close()
        await pool.wait_closed()


async def desconectar() -> None:
    if Database.pool is not None:
        Database.pool.close()
        await Database.pool.wait_closed()
        Database.pool = None


async def recuperar_pool() -> None:
    """Crea el pool en caliente si no existe (la base volvió a estar up).

    El 503 queda en el contrato; el detalle del error de MySQL solo va
    al log del servidor, nunca al cliente.
    """
    try:
        await conectar()
        logger.info("Pool de conexiones MySQL recuperado (%s)", settings.DB_NAME)
    except (aiomysql.MySQLError, OSError) as error:
        logger.warning("MySQL sigue sin estar disponible: %s", error)
        raise ApiError(
            estado_http=503,
            mensaje="La base de datos no está disponible.",
        ) from error


async def get_conexion() -> AsyncIterator[aiomysql.Connection]:
    """Dependencia de FastAPI: presta una conexión del pool por request.

    Si al arrancar la API la base no estaba disponible (pool en None), cada
    request reintenta crearlo: cuando MySQL vuelve, la API se recupera sola.
    """
    if Database.pool is None:
        await recuperar_pool()
    try:
        async with Database.pool.acquire() as conn:
            yield conn
    except aiomysql.MySQLError as error:
        logger.error("Error de MySQL al obtener conexión del pool: %s", error)
        raise ApiError(
            estado_http=503,
            mensaje="La base de datos no está disponible.",
        ) from error
