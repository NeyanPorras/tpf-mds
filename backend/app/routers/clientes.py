"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends, Query

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.cliente import (
    ClienteCrear,
    ClienteEditar,
    ClienteSalida,
    PaginaClientes,
)
from app.services import clientes

# ADMIN y VENDEDOR administran clientes; DEPOSITO no tiene acceso.
solo_admin_vendedor = Depends(seguridad.require_role("ADMIN", "VENDEDOR"))

router = APIRouter(tags=["clientes"])


@router.get("/clientes", response_model=PaginaClientes)
async def listar(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    zona: str | None = Query(default=None, pattern=r"^(Centro|Norte|Sur)$"),
    buscar: str | None = Query(default=None, max_length=150),
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> PaginaClientes:
    """Listado paginado con filtros ?zona=&buscar=: ADMIN y VENDEDOR."""
    return await clientes.ClientesService(conexion).listar(
        page=page, size=size, zona=zona, buscar=buscar
    )


@router.get("/clientes/{id_cliente}", response_model=ClienteSalida)
async def obtener(
    id_cliente: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Detalle de un cliente: ADMIN y VENDEDOR."""
    return await clientes.ClientesService(conexion).obtener(id_cliente)


@router.post("/clientes", response_model=ClienteSalida, status_code=201)
async def crear(
    datos: ClienteCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Crea un cliente (CUIT único y válido): ADMIN y VENDEDOR."""
    return await clientes.ClientesService(conexion).crear(datos)


@router.put("/clientes/{id_cliente}", response_model=ClienteSalida)
async def editar(
    id_cliente: int,
    datos: ClienteEditar,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> dict:
    """Edita un cliente: ADMIN y VENDEDOR."""
    return await clientes.ClientesService(conexion).editar(id_cliente, datos)


@router.delete("/clientes/{id_cliente}", status_code=204)
async def eliminar(
    id_cliente: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    usuario: dict = solo_admin_vendedor,
) -> None:
    """Borra un cliente (409 si tiene pedidos): ADMIN y VENDEDOR."""
    return await clientes.ClientesService(conexion).eliminar(id_cliente)
