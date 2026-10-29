"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.categoria import CategoriaCrear, CategoriaEditar, CategoriaSalida
from app.services import categorias

router = APIRouter(tags=["categorias"])


@router.get("/categorias", response_model=list[CategoriaSalida])
async def listar(
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> list:
    """Listado de categorías: todos los roles autenticados."""
    return await categorias.CategoriasService(conexion).listar()


@router.get("/categorias/{id_categoria}", response_model=CategoriaSalida)
async def obtener(
    id_categoria: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> dict:
    """Detalle de una categoría: todos los roles autenticados."""
    return await categorias.CategoriasService(conexion).obtener(id_categoria)


@router.post("/categorias", response_model=CategoriaSalida, status_code=201)
async def crear(
    datos: CategoriaCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Crea una categoría: solo ADMIN."""
    return await categorias.CategoriasService(conexion).crear(datos)


@router.put("/categorias/{id_categoria}", response_model=CategoriaSalida)
async def editar(
    id_categoria: int,
    datos: CategoriaEditar,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Renombra una categoría: solo ADMIN."""
    return await categorias.CategoriasService(conexion).editar(id_categoria, datos)


@router.delete("/categorias/{id_categoria}", status_code=204)
async def eliminar(
    id_categoria: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> None:
    """Borra una categoría (409 si tiene productos): solo ADMIN."""
    return await categorias.CategoriasService(conexion).eliminar(id_categoria)
