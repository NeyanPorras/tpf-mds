"""Reglas de negocio del CRUD de categorías."""
from typing import Any

from app.core.exceptions import ApiError
from app.repositories import categorias
from app.schemas.categoria import CategoriaCrear, CategoriaEditar


class CategoriasService:
    """CRUD de categorías: nombre único y no se borran si tienen productos."""

    def __init__(self, conexion: Any) -> None:
        self.repo = categorias.CategoriasRepository(conexion)

    async def listar(self) -> list[dict[str, Any]]:
        return await self.repo.listar()

    async def obtener(self, id_categoria: int) -> dict[str, Any]:
        fila = await self.repo.obtener_por_id(id_categoria)
        if fila is None:
            raise ApiError(
                estado_http=404, mensaje="La categoría no existe."
            )
        return fila

    async def crear(self, datos: CategoriaCrear) -> dict[str, Any]:
        duplicada = await self.repo.buscar_por_nombre(datos.nombre)
        if duplicada is not None:
            raise ApiError(
                estado_http=409,
                mensaje="Ya existe una categoría con ese nombre.",
                detalle={"categoria": duplicada["id"]},
            )
        id_nueva = await self.repo.crear(datos.nombre)
        return {"id": id_nueva, "nombre": datos.nombre}

    async def editar(
        self, id_categoria: int, datos: CategoriaEditar
    ) -> dict[str, Any]:
        actual = await self.obtener(id_categoria)
        nombre = datos.nombre if datos.nombre is not None else actual["nombre"]
        if nombre != actual["nombre"]:
            duplicada = await self.repo.buscar_por_nombre(nombre)
            if duplicada is not None:
                raise ApiError(
                    estado_http=409,
                    mensaje="Ya existe una categoría con ese nombre.",
                    detalle={"categoria": duplicada["id"]},
                )
        await self.repo.actualizar(id_categoria, nombre)
        return {"id": id_categoria, "nombre": nombre}

    async def eliminar(self, id_categoria: int) -> None:
        """Borra solo si no tiene productos (DELETE RESTRICT, 409)."""
        await self.obtener(id_categoria)
        cantidad = await self.repo.contar_productos(id_categoria)
        if cantidad > 0:
            raise ApiError(
                estado_http=409,
                mensaje="No se puede borrar una categoría con productos.",
                detalle={"productos": cantidad},
            )
        await self.repo.eliminar(id_categoria)
