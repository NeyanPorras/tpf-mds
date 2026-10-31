"""Reglas de negocio de ingresos de mercadería y listado de movimientos."""
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import movimientos, productos
from app.schemas.movimiento import (
    IngresoEntrada,
    PaginaMovimientos,
)


class MovimientosService:
    """Ingreso de mercadería: un movimiento ENTRADA y el stock, se hacen juntos o no.

    La conexión del pool viene con autocommit; acá abrimos una transacción
    explícita para que el INSERT y el UPDATE no queden desbalanceados si
    algo falla en el medio.
    """

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion
        self.repo = movimientos.MovimientosRepository(conexion)
        self.productos_repo = productos.ProductosRepository(conexion)

    async def registrar_entrada(
        self, id_producto: int, datos: IngresoEntrada, id_usuario: int
    ) -> dict[str, Any]:
        """Registra un ingreso: movimiento ENTRADA + suma de stock, atómico."""
        producto = await self.productos_repo.obtener_por_id(id_producto)
        if producto is None:
            raise ApiError(
                estado_http=404,
                mensaje="El producto no existe.",
                detalle={"producto_id": id_producto},
            )
        await self.conexion.begin()
        try:
            movimiento_id = await self.repo.crear_entrada(
                id_producto, id_usuario, datos.cantidad, datos.observacion
            )
            filas = await self.repo.sumar_stock(id_producto, datos.cantidad)
            if filas != 1:
                raise ApiError(
                    estado_http=404,
                    mensaje="El producto no existe.",
                    detalle={"producto_id": id_producto},
                )
            await self.conexion.commit()
        except aiomysql.MySQLError as error:
            await self.conexion.rollback()
            raise ApiError(
                estado_http=500,
                mensaje="No se pudo registrar el ingreso.",
            ) from error
        except ApiError:
            await self.conexion.rollback()
            raise
        stock_actual = await self.repo.obtener_stock(id_producto)
        return {
            "movimiento_id": movimiento_id,
            "producto_id": id_producto,
            "stock_actual": stock_actual,
        }

    async def listar(
        self, id_producto: int, page: int, size: int
    ) -> PaginaMovimientos:
        """Historial de movimientos del producto (ENTRADAS y SALIDAS)."""
        producto = await self.productos_repo.obtener_por_id(id_producto)
        if producto is None:
            raise ApiError(
                estado_http=404,
                mensaje="El producto no existe.",
                detalle={"producto_id": id_producto},
            )
        items = await self.repo.listar_por_producto(id_producto, size, (page - 1) * size)
        total = await self.repo.contar_por_producto(id_producto)
        return PaginaMovimientos(items=items, total=total, page=page, size=size)
