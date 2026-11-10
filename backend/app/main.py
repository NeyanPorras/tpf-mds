"""Punto de entrada de la API: `uvicorn app.main:app --reload`."""
import logging
from contextlib import asynccontextmanager

import aiomysql
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core import database
from app.core.config import settings
from app.core.exceptions import ApiError
from app.routers import (
    auth,
    categorias,
    clientes,
    pedidos,
    productos,
    proveedores,
    reportes,
    salud,
)

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Abre el pool al arrancar y lo cierra al parar.

    Si la base no levanta, la API igual arranca: /health responde 503.
    """
    try:
        await database.conectar()
        logger.info("Pool de conexiones MySQL listo (%s)", settings.DB_NAME)
    except Exception as error:  # noqa: BLE001 - el arranque no debe morir
        logger.warning("No se pudo conectar a MySQL al arrancar: %s", error)
    yield
    await database.desconectar()


def crear_app() -> FastAPI:
    """Fábrica de la aplicación: routers + manejo de errores del contrato.

    Los tests levantan esta misma app (sin conexión real) para verificar
    el contrato de errores.
    """
    app = FastAPI(
        title="Distribuidora de bebidas",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(ApiError)
    async def manejar_api_error(request: Request, error: ApiError):
        return error.como_json()

    @app.exception_handler(RequestValidationError)
    async def manejar_validacion(request: Request, error: RequestValidationError):
        """422 con `details` listaando campo y mensaje, como pide el contrato."""
        detalles = [
            {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]}
            for err in error.errors()
        ]
        return ApiError(
            estado_http=422,
            mensaje="Datos con tipo o formato incorrecto.",
            detalle=detalles,
        ).como_json()

    @app.exception_handler(StarletteHTTPException)
    async def manejar_http_error(request: Request, error: StarletteHTTPException):
        """404/401/403/etc. de FastAPI se re-envian en la forma del contrato."""
        return ApiError(
            estado_http=error.status_code,
            mensaje=str(error.detail),
        ).como_json()

    @app.exception_handler(aiomysql.MySQLError)
    async def manejar_mysql(request: Request, error: aiomysql.MySQLError):
        """Un error de MySQL fuera del request en curso no expone SQL."""
        logger.error("Error de MySQL en %s: %s", request.url.path, error)
        return ApiError(
            estado_http=503,
            mensaje="La base de datos no está disponible.",
        ).como_json()

    @app.exception_handler(Exception)
    async def manejar_error_no_previsto(request: Request, error: Exception):
        """500: nunca expone SQL ni stack trace al cliente."""
        logger.exception("Error no previsto en %s", request.url.path)
        return ApiError(
            estado_http=500,
            mensaje="Error interno del servidor.",
        ).como_json()

    app.include_router(salud.router, prefix=settings.API_PREFIX)
    app.include_router(auth.router, prefix=settings.API_PREFIX)
    app.include_router(categorias.router, prefix=settings.API_PREFIX)
    app.include_router(proveedores.router, prefix=settings.API_PREFIX)
    app.include_router(productos.router, prefix=settings.API_PREFIX)
    app.include_router(clientes.router, prefix=settings.API_PREFIX)
    app.include_router(pedidos.router, prefix=settings.API_PREFIX)
    app.include_router(reportes.router, prefix=settings.API_PREFIX)
    return app


app = crear_app()
