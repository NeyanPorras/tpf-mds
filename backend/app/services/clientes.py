"""Reglas de negocio del CRUD de clientes."""
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import clientes
from app.schemas.cliente import ClienteCrear, ClienteEditar, PaginaClientes


class ClientesService:
    """CRUD de clientes: CUIT único y no se borran si tienen pedidos.

    ADMIN y VENDEDOR administran clientes; DEPOSITO no tiene acceso.
    """

    def __init__(self, conexion: Any) -> None:
        self.repo = clientes.ClientesRepository(conexion)

    async def listar(
        self, page: int, size: int, zona: str | None, buscar: str | None
    ) -> PaginaClientes:
        filtros: dict[str, Any] = {"zona": zona, "buscar": buscar}
        items = await self.repo.listar(filtros, size, (page - 1) * size)
        total = await self.repo.contar(filtros)
        return PaginaClientes(items=items, total=total, page=page, size=size)

    async def obtener(self, id_cliente: int) -> dict[str, Any]:
        fila = await self.repo.obtener_por_id(id_cliente)
        if fila is None:
            raise ApiError(estado_http=404, mensaje="El cliente no existe.")
        return fila

    async def crear(self, datos: ClienteCrear) -> dict[str, Any]:
        duplicado = await self.repo.buscar_por_cuit(datos.cuit)
        if duplicado is not None:
            raise ApiError(
                estado_http=409,
                mensaje="Ya existe un cliente con ese CUIT.",
                detalle={"cliente": duplicado["id"]},
            )
        id_nuevo = await self.repo.crear(
            datos.razon_social, datos.cuit, datos.direccion, datos.zona, datos.telefono
        )
        return await self.obtener(id_nuevo)

    async def editar(self, id_cliente: int, datos: ClienteEditar) -> dict[str, Any]:
        actual = await self.obtener(id_cliente)
        nuevo = {
            "razon_social": (
                datos.razon_social
                if datos.razon_social is not None
                else actual["razon_social"]
            ),
            "cuit": datos.cuit if datos.cuit is not None else actual["cuit"],
            "direccion": (
                datos.direccion if datos.direccion is not None else actual["direccion"]
            ),
            "zona": datos.zona if datos.zona is not None else actual["zona"],
            "telefono": (
                datos.telefono if datos.telefono is not None else actual["telefono"]
            ),
        }
        if nuevo["cuit"] != actual["cuit"]:
            duplicado = await self.repo.buscar_por_cuit(nuevo["cuit"])
            if duplicado is not None:
                raise ApiError(
                    estado_http=409,
                    mensaje="Ya existe un cliente con ese CUIT.",
                    detalle={"cliente": duplicado["id"]},
                )
        await self.repo.actualizar(
            id_cliente,
            nuevo["razon_social"],
            nuevo["cuit"],
            nuevo["direccion"],
            nuevo["zona"],
            nuevo["telefono"],
        )
        return await self.obtener(id_cliente)

    async def eliminar(self, id_cliente: int) -> None:
        """Borra el cliente: 409 si ya tiene pedidos (FK RESTRICT)."""
        await self.obtener(id_cliente)
        pedidos_previos = await self.repo.contar_pedidos(id_cliente)
        if pedidos_previos > 0:
            raise ApiError(
                estado_http=409,
                mensaje="El cliente tiene pedidos y no se puede borrar.",
                detalle={"pedidos": pedidos_previos},
            )
        try:
            await self.repo.eliminar(id_cliente)
        except aiomysql.IntegrityError as error:  # carrera entre contar y borrar
            raise ApiError(
                estado_http=409,
                mensaje="El cliente tiene pedidos y no se puede borrar.",
            ) from error
