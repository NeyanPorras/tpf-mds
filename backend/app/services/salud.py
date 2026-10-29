"""Reglas de negocio del chequeo de salud."""
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import salud


class SaludService:
    """Verifica que la base de datos esté alcanzable."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def verificar(self) -> dict[str, Any]:
        try:
            await salud.SaludRepository(self.conexion).ping()
        except aiomysql.MySQLError as error:
            raise ApiError(
                estado_http=503,
                mensaje="La base de datos no está disponible.",
                detalle={"mysql": str(error)},
            ) from error
        return {"estado": "ok", "base_de_datos": "conectada"}
