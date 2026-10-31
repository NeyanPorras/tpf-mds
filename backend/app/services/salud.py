"""Reglas de negocio del chequeo de salud."""
import logging
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import salud

logger = logging.getLogger("uvicorn.error")


class SaludService:
    """Verifica que la base de datos esté alcanzable."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def verificar(self) -> dict[str, Any]:
        try:
            await salud.SaludRepository(self.conexion).ping()
        except aiomysql.MySQLError as error:
            # El detalle del error queda solo en el log: el contrato pide
            # no exponer detalles de la base al cliente.
            logger.warning("Health check falló: %s", error)
            raise ApiError(
                estado_http=503,
                mensaje="La base de datos no está disponible.",
            ) from error
        return {"estado": "ok", "base_de_datos": "conectada"}
