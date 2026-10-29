"""Pool de conexiones ASÍNCRONO a MySQL (aiomysql)."""
from typing import AsyncIterator

import aiomysql

from app.core.config import settings
from app.core.exceptions import ApiError


class Database:
    pool: aiomysql.Pool | None = None


async def conectar() -> None:
    Database.pool = await aiomysql.create_pool(
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


async def desconectar() -> None:
    if Database.pool is not None:
        Database.pool.close()
        await Database.pool.wait_closed()


async def get_conexion() -> AsyncIterator[aiomysql.Connection]:
    """Dependencia de FastAPI: presta una conexión del pool por request."""
    if Database.pool is None:
        raise ApiError(
            estado_http=503,
            mensaje="La base de datos no está disponible.",
        )
    try:
        async with Database.pool.acquire() as conn:
            yield conn
    except aiomysql.MySQLError as error:
        raise ApiError(
            estado_http=503,
            mensaje="La base de datos no está disponible.",
            detalle={"mysql": str(error)},
        ) from error
