"""Reglas de negocio del CRUD de productos."""
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import categorias, productos, proveedores
from app.schemas.producto import PaginaProductos, ProductoCrear, ProductoEditar


class ProductosService:
    """CRUD de productos.

    Los filtros de `GET /productos` viven acá; ningún router hace SQL.
    """

    def __init__(self, conexion: Any) -> None:
        self.repo = productos.ProductosRepository(conexion)
        self.categorias_repo = categorias.CategoriasRepository(conexion)
        self.proveedores_repo = proveedores.ProveedoresRepository(conexion)

    async def listar(
        self,
        page: int,
        size: int,
        categoria_id: int | None,
        proveedor_id: int | None,
        buscar: str | None,
        bajo_minimo: bool,
    ) -> PaginaProductos:
        filtros: dict[str, Any] = {
            "categoria_id": categoria_id,
            "proveedor_id": proveedor_id,
            "buscar": buscar,
            "bajo_minimo": bajo_minimo,
        }
        offset = (page - 1) * size
        items = await self.repo.listar(filtros, size, offset)
        total = await self.repo.contar(filtros)
        return PaginaProductos(items=items, total=total, page=page, size=size)

    async def obtener(self, id_producto: int) -> dict[str, Any]:
        fila = await self.repo.obtener_por_id(id_producto)
        if fila is None:
            raise ApiError(estado_http=404, mensaje="El producto no existe.")
        return fila

    async def _validar_referencias(
        self, categoria_id: int | None, proveedor_id: int | None
    ) -> None:
        """404 si la categoría o el proveedor referenciado no existen."""
        if categoria_id is not None and (
            await self.categorias_repo.obtener_por_id(categoria_id)
        ) is None:
            raise ApiError(
                estado_http=404, mensaje="La categoría no existe.",
                detalle={"categoria_id": categoria_id},
            )
        if proveedor_id is not None and (
            await self.proveedores_repo.obtener_por_id(proveedor_id)
        ) is None:
            raise ApiError(
                estado_http=404, mensaje="El proveedor no existe.",
                detalle={"proveedor_id": proveedor_id},
            )

    async def crear(self, datos: ProductoCrear) -> dict[str, Any]:
        """Crea el producto con stock en 0 (no se ajusta por acá)."""
        await self._validar_referencias(datos.categoria_id, datos.proveedor_id)
        duplicados = await self.repo.contar_mismo_nombre(
            datos.nombre, datos.presentacion
        )
        if duplicados > 0:
            raise ApiError(
                estado_http=409,
                mensaje="Ya existe un producto con ese nombre y presentación.",
            )
        id_nuevo = await self.repo.crear(
            nombre=datos.nombre,
            presentacion=datos.presentacion,
            precio=str(datos.precio),
            stock_minimo=datos.stock_minimo,
            categoria_id=datos.categoria_id,
            proveedor_id=datos.proveedor_id,
        )
        return await self.obtener(id_nuevo)

    async def _aplicar_edicion(
        self, actual: dict[str, Any], datos: ProductoEditar
    ) -> dict[str, Any]:
        """Fusiona el producto actual con los campos opcionales del body."""
        nuevo = {
            "nombre": datos.nombre if datos.nombre is not None else actual["nombre"],
            "presentacion": (
                datos.presentacion
                if datos.presentacion is not None
                else actual["presentacion"]
            ),
            "precio": (
                str(datos.precio) if datos.precio is not None else str(actual["precio"])
            ),
            "stock_minimo": (
                datos.stock_minimo
                if datos.stock_minimo is not None
                else actual["stock_minimo"]
            ),
            "categoria_id": (
                datos.categoria_id
                if datos.categoria_id is not None
                else actual["categoria"]["id"]
            ),
            "proveedor_id": (
                datos.proveedor_id
                if datos.proveedor_id is not None
                else actual["proveedor"]["id"]
            ),
        }
        await self._validar_referencias(
            nuevo["categoria_id"] if datos.categoria_id is not None else None,
            nuevo["proveedor_id"] if datos.proveedor_id is not None else None,
        )
        duplicados = await self.repo.contar_mismo_nombre(
            nuevo["nombre"], nuevo["presentacion"], excluyendo_id=actual["id"]
        )
        if duplicados > 0:
            raise ApiError(
                estado_http=409,
                mensaje="Ya existe un producto con ese nombre y presentación.",
            )
        return nuevo

    async def editar(
        self, id_producto: int, datos: ProductoEditar
    ) -> dict[str, Any]:
        actual = await self.obtener(id_producto)
        nuevo = await self._aplicar_edicion(actual, datos)
        await self.repo.actualizar(
            id_producto,
            nuevo["nombre"],
            nuevo["presentacion"],
            nuevo["precio"],
            nuevo["stock_minimo"],
            nuevo["categoria_id"],
            nuevo["proveedor_id"],
        )
        return await self.obtener(id_producto)

    async def eliminar(self, id_producto: int) -> None:
        """Borra el producto (409 si lo referencia algún pedido)."""
        await self.obtener(id_producto)
        try:
            await self.repo.eliminar(id_producto)
        except aiomysql.IntegrityError as error:
            raise ApiError(
                estado_http=409,
                mensaje="El producto está asociado a pedidos y no se puede borrar.",
            ) from error
