"""Reglas de negocio del CRUD de proveedores."""
from typing import Any

from app.core.exceptions import ApiError
from app.repositories import proveedores
from app.schemas.proveedor import ProveedorCrear, ProveedorEditar


class ProveedoresService:
    """CRUD de proveedores: CUIT único y no se borran si tienen productos."""

    def __init__(self, conexion: Any) -> None:
        self.repo = proveedores.ProveedoresRepository(conexion)

    async def listar(self) -> list[dict[str, Any]]:
        return await self.repo.listar()

    async def obtener(self, id_proveedor: int) -> dict[str, Any]:
        fila = await self.repo.obtener_por_id(id_proveedor)
        if fila is None:
            raise ApiError(estado_http=404, mensaje="El proveedor no existe.")
        return fila

    async def crear(self, datos: ProveedorCrear) -> dict[str, Any]:
        duplicado = await self.repo.buscar_por_cuit(datos.cuit)
        if duplicado is not None:
            raise ApiError(
                estado_http=409,
                mensaje="Ya existe un proveedor con ese CUIT.",
                detalle={"proveedor": duplicado["id"]},
            )
        id_nuevo = await self.repo.crear(
            datos.razon_social, datos.cuit, datos.telefono, datos.email
        )
        return {
            "id": id_nuevo,
            "razon_social": datos.razon_social,
            "cuit": datos.cuit,
            "telefono": datos.telefono,
            "email": datos.email,
        }

    async def _aplicar_edicion(
        self, actual: dict[str, Any], datos: ProveedorEditar
    ) -> dict[str, Any]:
        """Fusiona el proveedor actual con los campos opcionales del body."""
        nuevo = {
            "razon_social": datos.razon_social if datos.razon_social is not None else actual["razon_social"],
            "cuit": datos.cuit if datos.cuit is not None else actual["cuit"],
            "telefono": datos.telefono if datos.telefono is not None else actual["telefono"],
            "email": datos.email if datos.email is not None else actual["email"],
        }
        if nuevo["cuit"] != actual["cuit"]:
            duplicado = await self.repo.buscar_por_cuit(nuevo["cuit"])
            if duplicado is not None:
                raise ApiError(
                    estado_http=409,
                    mensaje="Ya existe un proveedor con ese CUIT.",
                    detalle={"proveedor": duplicado["id"]},
                )
        return nuevo

    async def editar(
        self, id_proveedor: int, datos: ProveedorEditar
    ) -> dict[str, Any]:
        actual = await self.obtener(id_proveedor)
        nuevo = await self._aplicar_edicion(actual, datos)
        await self.repo.actualizar(
            id_proveedor,
            nuevo["razon_social"],
            nuevo["cuit"],
            nuevo["telefono"],
            nuevo["email"],
        )
        return {"id": id_proveedor, **nuevo}

    async def eliminar(self, id_proveedor: int) -> None:
        """Borra solo si no tiene productos (DELETE RESTRICT, 409)."""
        await self.obtener(id_proveedor)
        cantidad = await self.repo.contar_productos(id_proveedor)
        if cantidad > 0:
            raise ApiError(
                estado_http=409,
                mensaje="No se puede borrar un proveedor con productos.",
                detalle={"productos": cantidad},
            )
        await self.repo.eliminar(id_proveedor)
