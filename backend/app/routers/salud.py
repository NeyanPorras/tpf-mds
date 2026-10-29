"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
from typing import Any

import aiomysql
from fastapi import APIRouter, Depends

from app.core.database import get_conexion
from app.services import salud

router = APIRouter(
    tags=["salud"],
)


@router.get("/health")
async def health(
    conexion: aiomysql.Connection = Depends(get_conexion),
) -> dict[str, Any]:
    """Chequeo de disponibilidad del backend y de la base de datos."""
    return await salud.SaludService(conexion).verificar()
