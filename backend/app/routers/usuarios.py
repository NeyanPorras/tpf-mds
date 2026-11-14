"""Recibe la petición HTTP y devuelve la respuesta. Sin SQL ni reglas."""
import aiomysql
from fastapi import APIRouter, Depends, Query

from app.core import seguridad
from app.core.database import get_conexion
from app.schemas.usuario import PaginaUsuarios, UsuarioAdmin, UsuarioCrear, UsuarioEditar
from app.services import usuarios

# Toda la sección es solo para ADMIN: el token lo identifica y require_role
# lee el rol actual de la base (un cambio de rol aplica en el request siguiente).
solo_admin = Depends(seguridad.require_role("ADMIN"))

router = APIRouter(tags=["usuarios"])


@router.get("/usuarios", response_model=PaginaUsuarios)
async def listar(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    conexion: aiomysql.Connection = Depends(get_conexion),
    operador: dict = solo_admin,
) -> PaginaUsuarios:
    """Listado paginado, con activos e inactivos: solo ADMIN."""
    return await usuarios.UsuariosService(conexion).listar(page=page, size=size)


@router.get("/usuarios/{id_usuario}", response_model=UsuarioAdmin)
async def obtener(
    id_usuario: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    operador: dict = solo_admin,
) -> dict:
    """Detalle de un usuario: solo ADMIN."""
    return await usuarios.UsuariosService(conexion).obtener(id_usuario)


@router.post("/usuarios", response_model=UsuarioAdmin, status_code=201)
async def crear(
    datos: UsuarioCrear,
    conexion: aiomysql.Connection = Depends(get_conexion),
    operador: dict = solo_admin,
) -> dict:
    """Crea un usuario (email único, contraseña con bcrypt): solo ADMIN."""
    return await usuarios.UsuariosService(conexion).crear(datos)


@router.put("/usuarios/{id_usuario}", response_model=UsuarioAdmin)
async def editar(
    id_usuario: int,
    datos: UsuarioEditar,
    conexion: aiomysql.Connection = Depends(get_conexion),
    operador: dict = solo_admin,
) -> dict:
    """Edita datos, rol, contraseña o reactiva (`activo: true`): solo ADMIN."""
    return await usuarios.UsuariosService(conexion).editar(id_usuario, datos, operador)


@router.delete("/usuarios/{id_usuario}", status_code=204)
async def desactivar(
    id_usuario: int,
    conexion: aiomysql.Connection = Depends(get_conexion),
    operador: dict = solo_admin,
) -> None:
    """Desactiva el usuario (baja lógica; no puede ser uno mismo): solo ADMIN."""
    await usuarios.UsuariosService(conexion).desactivar(id_usuario, operador)
