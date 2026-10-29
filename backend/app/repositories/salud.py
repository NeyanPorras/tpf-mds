"""Único lugar (junto a los demás repositorios) donde vive SQL."""
from typing import Any

import aiomysql


class SaludRepository:
    """Consultas del chequeo de salud del backend."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion

    async def ping(self) -> tuple[Any, ...]:
        """Corre `SELECT 1` para verificar que la base responde."""
        async with self.conexion.cursor() as cursor:
            await cursor.execute("SELECT 1")
            fila: tuple[Any, ...] = await cursor.fetchone()
            return fila
