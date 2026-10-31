"""Reglas de negocio de pedidos: crear PENDIENTE, cancelar, confirmar y entregar.

- La confirmación no abre transacción en el backend: la maneja el
  procedimiento `sp_confirmar_pedido` (commit y rollback propios).
- Los errores de negocio que señala el SP se traducen a los pares
  HTTP/code del contrato (ver database/03_procedures.sql).
"""
from datetime import date, datetime, time, timedelta
from typing import Any

import aiomysql

from app.core.exceptions import ApiError
from app.repositories import clientes, pedidos, productos
from app.schemas.pedido import (
    ClienteAnidado,
    LineaSalida,
    PaginaPedidos,
    PedidoCrear,
    ProductoDeLinea,
    VendedorAnidado,
)


def _rango(
    desde: date | None, hasta: date | None
) -> tuple[datetime | None, datetime | None]:
    """Los filtros ?desde=&hasta= son fechas: incluye el día completo."""
    return (
        None if desde is None else datetime.combine(desde, time.min),
        None if hasta is None else datetime.combine(hasta + timedelta(days=1), time.min),
    )


class PedidosService:
    """Los pedidos nacen PENDIENTE; el stock y el total solo toca el SP."""

    def __init__(self, conexion: aiomysql.Connection) -> None:
        self.conexion = conexion
        self.repo = pedidos.PedidosRepository(conexion)
        self.clientes_repo = clientes.ClientesRepository(conexion)
        self.productos_repo = productos.ProductosRepository(conexion)

    # ------------------------------------------------------------------
    # Lectura
    # ------------------------------------------------------------------

    async def listar(
        self,
        page: int,
        size: int,
        estado: str | None,
        cliente_id: int | None,
        desde: date | None,
        hasta: date | None,
    ) -> PaginaPedidos:
        desde_dt, hasta_dt = _rango(desde, hasta)
        filtros: dict[str, Any] = {
            "estado": estado,
            "cliente_id": cliente_id,
            "desde": desde_dt,
            "hasta": hasta_dt,
        }
        filas = await self.repo.listar(filtros, size, (page - 1) * size)
        total = await self.repo.contar(filtros)
        return PaginaPedidos(
            items=[
                _a_salida(fila, lineas=[]) for fila in filas
            ],  # el listado no incluye líneas (así lo pide el contrato)
            total=total,
            page=page,
            size=size,
        )

    async def obtener(self, id_pedido: int) -> dict[str, Any]:
        """Detalle completo: cabecera + líneas, 404 si no existe."""
        return await self._armar(id_pedido, con_lineas=True)

    async def _armar(self, id_pedido: int, con_lineas: bool) -> dict[str, Any]:
        """Junta cabecera + líneas con la forma anidada del contrato."""
        fila = await self.repo.obtener_cabecera(id_pedido)
        if fila is None:
            raise ApiError(
                estado_http=404,
                mensaje="El pedido no existe.",
                detalle={"pedido_id": id_pedido},
            )
        lineas = await self.repo.listar_lineas(id_pedido) if con_lineas else []
        return _a_salida(fila, lineas)

    # ------------------------------------------------------------------
    # Crear PENDIENTE
    # ------------------------------------------------------------------

    async def crear(self, datos: PedidoCrear, id_usuario: int) -> dict[str, Any]:
        """Crea el pedido PENDIENTE copiando el precio de cada producto."""
        if await self.clientes_repo.obtener_por_id(datos.cliente_id) is None:
            raise ApiError(
                estado_http=404,
                mensaje="El cliente no existe.",
                detalle={"cliente_id": datos.cliente_id},
            )

        ids = [linea.producto_id for linea in datos.lineas]
        productos_data = await self.repo.obtener_precios(ids)
        faltantes = sorted(set(ids) - set(productos_data))
        if faltantes:
            raise ApiError(
                estado_http=404,
                mensaje="Algún producto del pedido no existe.",
                detalle={"productos": faltantes},
            )
        repetidos = sorted(
            {id_producto for id_producto in ids if ids.count(id_producto) > 1}
        )
        if repetidos:
            raise ApiError(
                estado_http=409,
                mensaje="Los productos no se pueden repetir en un pedido.",
                detalle={"productos": repetidos},
            )

        # Transacción: cabecera y líneas van juntos o no van.
        await self.conexion.begin()
        try:
            id_nuevo = await self.repo.crear_cabecera(
                datos.cliente_id, id_usuario, datetime.now()
            )
            for linea in datos.lineas:
                await self.repo.crear_linea(
                    id_nuevo,
                    linea.producto_id,
                    linea.cantidad,
                    productos_data[linea.producto_id]["precio"],
                )
            await self.conexion.commit()
        except aiomysql.MySQLError as error:
            await self.conexion.rollback()
            raise ApiError(
                estado_http=500,
                mensaje="No se pudo crear el pedido.",
            ) from error
        return await self._armar(id_nuevo, con_lineas=True)

    # ------------------------------------------------------------------
    # Confirmar (con el procedimiento almacenado)
    # ------------------------------------------------------------------

    async def confirmar(self, id_pedido: int, id_usuario: int) -> dict[str, Any]:
        """Llama `sp_confirmar_pedido` y traduce sus errores de negocio.

        El SP confirma en una sola transacción: valida stock, descuenta,
        registra los movimientos SALIDA, calcula el total y pasa el pedido
        a CONFIRMADO. Si algo falla, deshace todo y relanza un SIGNAL.

        Traducción de los SIGNAL del SP: pymysql NO respeta el MYSQL_ERRNO
        del SIGNAL (reporta un número sin sentido), pero sí el MESSAGE_TEXT;
        por eso el mapeo es por el texto de cada erro, que el SP ya forma
        como mensajes de la API (ver database/03_procedures.sql).
        """
        if await self.repo.obtener_estado(id_pedido) is None:
            raise ApiError(
                estado_http=404,
                mensaje="El pedido no existe.",
                detalle={"pedido_id": id_pedido},
            )
        try:
            await self.repo.llamar_sp_confirmar(id_pedido, id_usuario)
        except aiomysql.MySQLError as error:
            # (errno_raro, MESSAGE_TEXT) para los SIGNAL del SP.
            texto_sp = ""
            if isinstance(error.args, tuple) and len(error.args) > 1:
                texto_sp = str(error.args[1] if error.args[1] is not None else "")
            if texto_sp.startswith("No hay stock suficiente"):
                faltante = await self.repo.obtener_faltante(id_pedido)
                raise ApiError(
                    estado_http=409,
                    code="STOCK_INSUFICIENTE",
                    mensaje=texto_sp,  # ya incluye el nombre del producto
                    detalle=None if faltante is None else {
                        "producto_id": faltante["producto_id"],
                        "solicitado": faltante["solicitado"],
                        "disponible": faltante["disponible"],
                    },
                ) from error
            if texto_sp.startswith("Solo se puede confirmar"):
                raise ApiError(
                    estado_http=409,
                    code="ESTADO_INVALIDO",
                    mensaje=texto_sp,
                    detalle={"estado_necesario": "PENDIENTE"},
                ) from error
            if texto_sp.startswith("El pedido no tiene lineas"):
                raise ApiError(
                    estado_http=400,
                    mensaje="El pedido no tiene líneas.",
                ) from error
            if texto_sp.startswith("El pedido ") and texto_sp.endswith(" no existe"):
                raise ApiError(
                    estado_http=404,
                    mensaje="El pedido no existe.",
                    detalle={"pedido_id": id_pedido},
                ) from error
            if texto_sp.startswith("El usuario que confirma"):
                raise ApiError(
                    estado_http=400,
                    mensaje="El usuario que confirma no existe o está inactivo.",
                ) from error
            raise ApiError(
                estado_http=500,
                mensaje="No se pudo confirmar el pedido.",
            ) from error
        return await self._armar(id_pedido, con_lineas=True)

    # ------------------------------------------------------------------
    # Cancelar y entregar (transiciones simples)
    # ------------------------------------------------------------------

    async def cancelar(self, id_pedido: int) -> dict[str, Any]:
        """Solo un pedido PENDIENTE se cancela."""
        await self.obtener(id_pedido)
        await self._exigir_estado(id_pedido, "PENDIENTE", "cancelar")
        await self.repo.cambiar_estado(id_pedido, "CANCELADO")
        return await self._armar(id_pedido, con_lineas=True)

    async def entregar(self, id_pedido: int) -> dict[str, Any]:
        """Solo un pedido CONFIRMADO se puede marcar ENTREGADO."""
        await self.obtener(id_pedido)
        await self._exigir_estado(id_pedido, "CONFIRMADO", "entregar")
        await self.repo.cambiar_estado(id_pedido, "ENTREGADO")
        return await self._armar(id_pedido, con_lineas=True)

    async def _exigir_estado(self, id_pedido: int, esperado: str, accion: str) -> None:
        estado = await self.repo.obtener_estado(id_pedido)
        if estado != esperado:
            raise ApiError(
                estado_http=409,
                code="ESTADO_INVALIDO",
                mensaje=(
                    f"Solo se puede {accion} un pedido {esperado} "
                    f"(estado actual: {estado})"
                ),
                detalle={"estado_actual": estado, "estado_necesario": esperado},
            )


def _a_salida(fila: dict[str, Any], lineas: list[dict[str, Any]]) -> dict[str, Any]:
    """Arma la forma anidada del contrato a partir de las filas del repositorio."""
    return {
        "id": fila["id"],
        "fecha": fila["fecha"],
        "estado": fila["estado"],
        "total": fila["total"],
        "cliente": ClienteAnidado(
            id=fila["cliente_id"], razon_social=fila["cliente_razon_social"]
        ),
        "vendedor": VendedorAnidado(
            id=fila["vendedor_id"], nombre=fila["vendedor_nombre"]
        ),
        "lineas": [
            LineaSalida(
                id=linea["id"],
                producto=ProductoDeLinea(
                    id=linea["producto_id"],
                    nombre=linea["producto_nombre"],
                    presentacion=linea["producto_presentacion"],
                ),
                cantidad=linea["cantidad"],
                precio_unitario=linea["precio_unitario"],
                subtotal=linea["subtotal"],
            )
            for linea in lineas
        ],
    }
