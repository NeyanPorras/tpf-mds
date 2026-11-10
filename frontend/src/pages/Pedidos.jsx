import { useCallback, useEffect, useMemo, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import { ESTADOS_PEDIDO } from '../api/tipos.js'
import { useAuth } from '../auth/useAuth.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import '../components/Formulario.css'
import './Pedidos.css'

const TAMAÑO = 10

function dinero(n) {
  return (
    '$ ' +
    Number(n).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function fechaHora(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) {
    return iso
  }
  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EtiquetaEstado({ estado }) {
  return <span className={`estado estado-${estado.toLowerCase()}`}>{estado}</span>
}

/** Aviso destacado del 409 STOCK_INSUFICIENTE: es el caso que pide F5. */
function AlertaStock({ alerta }) {
  const { pedidoId, mensaje, nombre, solicitado, disponible } = alerta
  const faltan =
    solicitado != null && disponible != null ? solicitado - disponible : null

  return (
    <div className="alerta-stock" role="alert">
      <h3>Falta de stock: no se pudo confirmar el pedido #{pedidoId}</h3>
      <p className="alerta-stock-mensaje">{mensaje}</p>

      {solicitado != null && disponible != null && (
        <dl className="alerta-stock-detalle">
          {nombre && (
            <div>
              <dt>Producto</dt>
              <dd>{nombre}</dd>
            </div>
          )}
          <div>
            <dt>Solicitado</dt>
            <dd>{solicitado} unidades</dd>
          </div>
          <div>
            <dt>Disponible</dt>
            <dd>{disponible} unidades</dd>
          </div>
          {faltan > 0 && (
            <div>
              <dt>Faltan</dt>
              <dd className="alerta-stock-faltan">{faltan} unidades</dd>
            </div>
          )}
        </dl>
      )}

      <p className="alerta-stock-ayuda">
        La confirmación no descontó stock: la operación se revirtió completa. Reponé
        mercadería con un ingreso y volvé a confirmar, o reducí la cantidad del pedido.
      </p>
    </div>
  )
}

export default function Pedidos() {
  const { usuario } = useAuth()
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'VENDEDOR'
  const puedeEntregar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DEPOSITO'

  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [avisoExito, setAvisoExito] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)

  // Filtros del contrato: estado, desde y hasta.
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // Catálogos para armar el pedido (solo ADMIN y VENDEDOR pueden crearlos).
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])

  // Modal "Nuevo pedido".
  const [modalCrear, setModalCrear] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [lineas, setLineas] = useState([])
  const [productoElegido, setProductoElegido] = useState('')
  const [cantidadElegida, setCantidadElegida] = useState('1')
  const [errorCrear, setErrorCrear] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Modal de detalle.
  const [modalDetalle, setModalDetalle] = useState(false)
  const [pedidoDetalle, setPedidoDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)

  // Acciones en curso y último error de stock (se muestra arriba del listado).
  const [confirmandoId, setConfirmandoId] = useState(null)
  const [actualizandoId, setActualizandoId] = useState(null)
  const [alertaStock, setAlertaStock] = useState(null)

  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  )

  const cargar = useCallback(
    async (nuevaPagina = 1) => {
      setCargando(true)
      setError(null)
      try {
        const params = { page: nuevaPagina, size: TAMAÑO }
        if (estadoFiltro) params.estado = estadoFiltro
        if (desde) params.desde = desde
        if (hasta) params.hasta = hasta

        const { data } = await http.get('/pedidos', { params })
        setPedidos(data.items)
        setPagina(data.page)
        setPaginas(Math.max(1, Math.ceil(data.total / data.size)))
      } catch (err) {
        setError(mensajeDeError(err))
      } finally {
        setCargando(false)
      }
    },
    [estadoFiltro, desde, hasta]
  )

  useEffect(() => {
    cargar(1)
  }, [cargar])

  useEffect(() => {
    if (!puedeGestionar) {
      return undefined
    }
    let vigente = true

    async function cargarCatalogos() {
      try {
        const [resProductos, resClientes] = await Promise.all([
          http.get('/productos', { params: { page: 1, size: 100 } }),
          http.get('/clientes', { params: { page: 1, size: 100 } }),
        ])
        if (!vigente) return
        setProductos(resProductos.data.items)
        setClientes(resClientes.data.items)
      } catch {
        // Sin catálogos el listado sigue funcionando; los selects quedan vacíos.
      }
    }

    cargarCatalogos()
    return () => {
      vigente = false
    }
  }, [puedeGestionar])

  function nombreProducto(idProducto) {
    const producto = productosPorId.get(idProducto)
    return producto ? `${producto.nombre} ${producto.presentacion}` : null
  }

  // ------------------------------------------------------------------
  // Detalle
  // ------------------------------------------------------------------

  async function abrirDetalle(idPedido) {
    setModalDetalle(true)
    setCargandoDetalle(true)
    setErrorDetalle(null)
    setPedidoDetalle(null)
    try {
      const { data } = await http.get(`/pedidos/${idPedido}`)
      setPedidoDetalle(data)
    } catch (err) {
      setErrorDetalle(mensajeDeError(err))
    } finally {
      setCargandoDetalle(false)
    }
  }

  function verDetalle(pedido) {
    setAlertaStock(null)
    setError(null)
    abrirDetalle(pedido.id)
  }

  // ------------------------------------------------------------------
  // Confirmar / cancelar / entregar
  // ------------------------------------------------------------------

  async function confirmarPedido(pedido, { abrirSiFalla = true } = {}) {
    setConfirmandoId(pedido.id)
    setError(null)
    setErrorDetalle(null)
    setAvisoExito(null)
    try {
      const { data } = await http.post(`/pedidos/${pedido.id}/confirmar`)
      setAvisoExito(
        `Pedido #${data.id} confirmado. Total: ${dinero(data.total)}.`
      )
      setAlertaStock(null)
      setPedidoDetalle((actual) =>
        actual && actual.id === data.id ? data : actual
      )
      await cargar(pagina)
    } catch (err) {
      const cuerpo = err.response?.data?.error
      if (err.response?.status === 409 && cuerpo?.code === 'STOCK_INSUFICIENTE') {
        const detalles = cuerpo.details ?? {}
        setAlertaStock({
          pedidoId: pedido.id,
          mensaje: cuerpo.message,
          nombre: nombreProducto(detalles.producto_id) ?? undefined,
          ...detalles,
        })
        const yaAbierto =
          modalDetalle && pedidoDetalle?.id === pedido.id
        if (abrirSiFalla && !yaAbierto) {
          await abrirDetalle(pedido.id)
        }
      } else {
        const mensaje = mensajeDeError(err)
        if (modalDetalle) {
          setErrorDetalle(mensaje)
        } else {
          setError(mensaje)
        }
      }
    } finally {
      setConfirmandoId(null)
    }
  }

  async function cancelarPedido(pedido) {
    if (!window.confirm(`¿Seguro que querés cancelar el pedido #${pedido.id}?`)) {
      return
    }
    setActualizandoId(pedido.id)
    setError(null)
    setErrorDetalle(null)
    setAvisoExito(null)
    try {
      const { data } = await http.post(`/pedidos/${pedido.id}/cancelar`)
      setAvisoExito(`Pedido #${data.id} cancelado.`)
      setAlertaStock(null)
      setPedidoDetalle((actual) =>
        actual && actual.id === data.id ? data : actual
      )
      await cargar(pagina)
    } catch (err) {
      const mensaje = mensajeDeError(err)
      if (modalDetalle) {
        setErrorDetalle(mensaje)
      } else {
        setError(mensaje)
      }
    } finally {
      setActualizandoId(null)
    }
  }

  async function entregarPedido(pedido) {
    setActualizandoId(pedido.id)
    setError(null)
    setErrorDetalle(null)
    setAvisoExito(null)
    try {
      const { data } = await http.post(`/pedidos/${pedido.id}/entregar`)
      setAvisoExito(`Pedido #${data.id} marcado como ENTREGADO.`)
      setPedidoDetalle((actual) =>
        actual && actual.id === data.id ? data : actual
      )
      await cargar(pagina)
    } catch (err) {
      const mensaje = mensajeDeError(err)
      if (modalDetalle) {
        setErrorDetalle(mensaje)
      } else {
        setError(mensaje)
      }
    } finally {
      setActualizandoId(null)
    }
  }

  // ------------------------------------------------------------------
  // Crear pedido con líneas
  // ------------------------------------------------------------------

  function abrirCrear() {
    setClienteId('')
    setLineas([])
    setProductoElegido('')
    setCantidadElegida('1')
    setErrorCrear(null)
    setAlertaStock(null)
    setError(null)
    setModalCrear(true)
  }

  function agregarLinea() {
    const producto = productosPorId.get(Number(productoElegido))
    const cantidad = Number(cantidadElegida)

    if (!producto) {
      setErrorCrear('Elegí un producto para agregar la línea.')
      return
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorCrear('La cantidad debe ser un número entero mayor a 0.')
      return
    }
    if (lineas.some((linea) => linea.producto_id === producto.id)) {
      setErrorCrear('Ese producto ya está en el pedido: editá su cantidad en la tabla.')
      return
    }

    setLineas((actuales) => [
      ...actuales,
      { producto_id: producto.id, cantidad },
    ])
    setProductoElegido('')
    setCantidadElegida('1')
    setErrorCrear(null)
  }

  function cambiarCantidad(idProducto, valor) {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.producto_id === idProducto ? { ...linea, cantidad: valor } : linea
      )
    )
  }

  function quitarLinea(idProducto) {
    setLineas((actuales) =>
      actuales.filter((linea) => linea.producto_id !== idProducto)
    )
  }

  const totalEstimado = useMemo(
    () =>
      lineas.reduce((acumulado, linea) => {
        const producto = productosPorId.get(linea.producto_id)
        const cantidad = Number(linea.cantidad)
        if (!producto || !Number.isFinite(cantidad)) {
          return acumulado
        }
        return acumulado + producto.precio * cantidad
      }, 0),
    [lineas, productosPorId]
  )

  async function crearPedido(evento) {
    evento.preventDefault()
    setErrorCrear(null)

    if (!clienteId) {
      setErrorCrear('Elegí el cliente del pedido.')
      return
    }
    if (lineas.length === 0) {
      setErrorCrear('Agregá al menos una línea al pedido.')
      return
    }

    const lineasPayload = []
    for (const linea of lineas) {
      const cantidad = Number(linea.cantidad)
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setErrorCrear(
          'Todas las cantidades deben ser números enteros mayores a 0.'
        )
        return
      }
      lineasPayload.push({
        producto_id: linea.producto_id,
        cantidad,
      })
    }

    setGuardando(true)
    try {
      const { data } = await http.post('/pedidos', {
        cliente_id: Number(clienteId),
        lineas: lineasPayload,
      })
      setModalCrear(false)
      setAvisoExito(
        `Pedido #${data.id} creado en estado PENDIENTE. Ya se puede confirmar desde el listado.`
      )
      await cargar(1)
    } catch (err) {
      setErrorCrear(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const columnas = [
    { clave: 'id', titulo: 'ID', render: (p) => `#${p.id}` },
    { clave: 'fecha', titulo: 'Fecha', render: (p) => fechaHora(p.fecha) },
    {
      clave: 'cliente',
      titulo: 'Cliente',
      render: (p) => p.cliente?.razon_social,
    },
    {
      clave: 'vendedor',
      titulo: 'Vendedor',
      render: (p) => p.vendedor?.nombre,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (p) => <EtiquetaEstado estado={p.estado} />,
    },
    {
      clave: 'total',
      titulo: 'Total',
      render: (p) =>
        p.estado === 'CONFIRMADO' || p.estado === 'ENTREGADO'
          ? dinero(p.total)
          : '—',
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (p) => (
        <div className="fila-acciones">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => verDetalle(p)}
          >
            Ver
          </button>

          {p.estado === 'PENDIENTE' && puedeGestionar && (
            <>
              <button
                type="button"
                className="btn-confirmar"
                disabled={confirmandoId === p.id}
                onClick={() => confirmarPedido(p)}
              >
                {confirmandoId === p.id ? 'Confirmando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                className="btn-peligro"
                disabled={actualizandoId === p.id}
                onClick={() => cancelarPedido(p)}
              >
                Cancelar
              </button>
            </>
          )}

          {p.estado === 'CONFIRMADO' && puedeEntregar && (
            <button
              type="button"
              className="btn-secundario"
              disabled={actualizandoId === p.id}
              onClick={() => entregarPedido(p)}
            >
              {actualizandoId === p.id ? 'Entregando…' : 'Entregar'}
            </button>
          )}
        </div>
      ),
    },
  ]

  const productosDisponibles = productos.filter(
    (producto) => !lineas.some((linea) => linea.producto_id === producto.id)
  )

  return (
    <section>
      <header className="pedidos-cabecera">
        <div>
          <h2>Pedidos</h2>
          <p>
            Armá pedidos con líneas, confirmalos y controlá el stock. Si falta
            mercadería, la confirmación se revierte y se muestra el detalle.
          </p>
        </div>
        {puedeGestionar && (
          <button type="button" onClick={abrirCrear}>
            Nuevo pedido
          </button>
        )}
      </header>

      <div className="filtros-barra">
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>

        <label className="filtro-fecha">
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label className="filtro-fecha">
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
      </div>

      {alertaStock && <AlertaStock alerta={alertaStock} />}
      {avisoExito && <p className="aviso-exito">{avisoExito}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={pedidos}
        cargando={cargando}
        mensajeVacio="No se encontraron pedidos."
        paginacion={{ pagina, paginas, onPagina: cargar }}
      />

      {/* Nuevo pedido */}
      <Modal
        abierto={modalCrear}
        titulo="Nuevo pedido"
        onCerrar={() => setModalCrear(false)}
        className="modal-ancho"
      >
        <form className="pedido-form" onSubmit={crearPedido} noValidate>
          <label className="formulario-campo">
            <span>Cliente *</span>
            <select
              name="cliente_id"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={guardando}
            >
              <option value="">-- Seleccionar cliente --</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razon_social} ({cliente.zona})
                </option>
              ))}
            </select>
          </label>

          <fieldset className="linea-builder">
            <legend>Agregar línea</legend>
            <label className="formulario-campo linea-producto">
              <span>Producto</span>
              <select
                name="producto_id"
                value={productoElegido}
                onChange={(e) => setProductoElegido(e.target.value)}
                disabled={guardando}
              >
                <option value="">-- Elegir producto --</option>
                {productosDisponibles.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} {producto.presentacion} — stock{' '}
                    {producto.stock}
                  </option>
                ))}
              </select>
            </label>

            <label className="formulario-campo linea-cantidad">
              <span>Cantidad</span>
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                value={cantidadElegida}
                onChange={(e) => setCantidadElegida(e.target.value)}
                disabled={guardando}
              />
            </label>

            <button
              type="button"
              className="btn-agregar"
              onClick={agregarLinea}
              disabled={guardando || !productoElegido}
            >
              Agregar
            </button>
          </fieldset>

          {lineas.length === 0 ? (
            <p className="pedido-vacio">Todavía no agregaste líneas.</p>
          ) : (
            <table className="tabla-detalle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea) => {
                  const producto = productosPorId.get(linea.producto_id)
                  const cantidad = Number(linea.cantidad)
                  const subtotal =
                    producto && Number.isFinite(cantidad)
                      ? producto.precio * cantidad
                      : 0
                  return (
                    <tr key={linea.producto_id}>
                      <td>
                        {producto?.nombre}{' '}
                        <span className="linea-presentacion">
                          {producto?.presentacion}
                        </span>
                      </td>
                      <td>{dinero(producto?.precio ?? 0)}</td>
                      <td>
                        <input
                          className="input-cantidad"
                          type="number"
                          min="1"
                          step="1"
                          value={linea.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(linea.producto_id, e.target.value)
                          }
                          disabled={guardando}
                        />
                      </td>
                      <td>{dinero(subtotal)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-peligro btn-chico"
                          onClick={() => quitarLinea(linea.producto_id)}
                          disabled={guardando}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {lineas.map((linea) => {
            const producto = productosPorId.get(linea.producto_id)
            const cantidad = Number(linea.cantidad)
            if (
              !producto ||
              !Number.isFinite(cantidad) ||
              cantidad <= producto.stock
            ) {
              return null
            }
            return (
              <p
                key={`aviso-${linea.producto_id}`}
                className="aviso-stock-linea"
                role="status"
              >
                Atención: pedís {cantidad} de {producto.nombre} y hay{' '}
                {producto.stock} en stock. El pedido se puede crear, pero la
                confirmación va a fallar hasta reponer mercadería.
              </p>
            )
          })}

          <div className="pedido-total">
            <span>Total estimado</span>
            <strong>{dinero(totalEstimado)}</strong>
          </div>
          <p className="pedido-nota">
            El precio de cada línea se copia del producto al crear el pedido y
            el total definitivo se calcula al confirmar.
          </p>

          {errorCrear && (
            <p className="formulario-error formulario-error-general">
              {errorCrear}
            </p>
          )}

          <div className="pedido-acciones">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => setModalCrear(false)}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detalle del pedido */}
      <Modal
        abierto={modalDetalle}
        titulo={pedidoDetalle ? `Pedido #${pedidoDetalle.id}` : 'Detalle del pedido'}
        onCerrar={() => setModalDetalle(false)}
        className="modal-ancho"
      >
        {cargandoDetalle && <p className="pedido-cargando">Cargando pedido…</p>}

        {!cargandoDetalle && errorDetalle && (
          <p className="aviso-error">{errorDetalle}</p>
        )}

        {!cargandoDetalle && pedidoDetalle && (
          <div className="pedido-detalle">
            {alertaStock && alertaStock.pedidoId === pedidoDetalle.id && (
              <AlertaStock alerta={alertaStock} />
            )}

            <dl className="pedido-datos">
              <div>
                <dt>Estado</dt>
                <dd>
                  <EtiquetaEstado estado={pedidoDetalle.estado} />
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{fechaHora(pedidoDetalle.fecha)}</dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{pedidoDetalle.cliente?.razon_social}</dd>
              </div>
              <div>
                <dt>Vendedor</dt>
                <dd>{pedidoDetalle.vendedor?.nombre}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  {pedidoDetalle.estado === 'CONFIRMADO' ||
                  pedidoDetalle.estado === 'ENTREGADO'
                    ? dinero(pedidoDetalle.total)
                    : 'Se calcula al confirmar'}
                </dd>
              </div>
            </dl>

            <table className="tabla-detalle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedidoDetalle.lineas.map((linea) => (
                  <tr key={linea.id}>
                    <td>
                      {linea.producto.nombre}{' '}
                      <span className="linea-presentacion">
                        {linea.producto.presentacion}
                      </span>
                    </td>
                    <td>{linea.cantidad}</td>
                    <td>{dinero(linea.precio_unitario)}</td>
                    <td>{dinero(linea.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pedido-acciones">
              {pedidoDetalle.estado === 'PENDIENTE' && puedeGestionar && (
                <>
                  <button
                    type="button"
                    className="btn-peligro"
                    onClick={() => cancelarPedido(pedidoDetalle)}
                    disabled={
                      actualizandoId === pedidoDetalle.id ||
                      confirmandoId === pedidoDetalle.id
                    }
                  >
                    Cancelar pedido
                  </button>
                  <button
                    type="button"
                    className="btn-confirmar"
                    onClick={() =>
                      confirmarPedido(pedidoDetalle, { abrirSiFalla: false })
                    }
                    disabled={confirmandoId === pedidoDetalle.id}
                  >
                    {confirmandoId === pedidoDetalle.id
                      ? 'Confirmando…'
                      : 'Confirmar pedido'}
                  </button>
                </>
              )}

              {pedidoDetalle.estado === 'CONFIRMADO' && puedeEntregar && (
                <button
                  type="button"
                  onClick={() => entregarPedido(pedidoDetalle)}
                  disabled={actualizandoId === pedidoDetalle.id}
                >
                  {actualizandoId === pedidoDetalle.id
                    ? 'Entregando…'
                    : 'Marcar entregado'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
