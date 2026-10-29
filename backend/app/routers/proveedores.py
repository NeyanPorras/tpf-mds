"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.proveedor import (
    ProveedorCrear,
    ProveedorEditar,
    ProveedorSalida,
)
from app.services import proveedores

router = APIRouter(tags=["proveedores"])


@router.get("/proveedores", response_model=list[ProveedorSalida])
async def listar(
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> list:
    """Listado de proveedores: todos los roles autenticados."""
    return await proveedores.ProveedoresService(conexion).listar()


@router.get("/proveedores/{id_proveedor}", response_model=ProveedorSalida)
async def obtener(
    id_proveedor: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.get_current_user),
) -> dict:
    """Detalle de un proveedor: todos los roles autenticados."""
    return await proveedores.ProveedoresService(conexion).obtener(id_proveedor)


@router.post("/proveedores", response_model=ProveedorSalida, status_code=201)
async def crear(
    datos: ProveedorCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Crea un proveedor (CUIT con formato y único): solo ADMIN."""
    return await proveedores.ProveedoresService(conexion).crear(datos)


@router.put("/proveedores/{id_proveedor}", response_model=ProveedorSalida)
async def editar(
    id_proveedor: int,
    datos: ProveedorEditar,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> dict:
    """Edita un proveedor: solo ADMIN."""
    return await proveedores.ProveedoresService(conexion).editar(id_proveedor, datos)


@router.delete("/proveedores/{id_proveedor}", status_code=204)
async def eliminar(
    id_proveedor: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = Depends(seguridad.require_role("ADMIN")),
) -> None:
    """Borra un proveedor (409 si tiene productos): solo ADMIN."""
    return await proveedores.ProveedoresService(conexion).eliminar(id_proveedor)
