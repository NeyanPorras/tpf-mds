import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import Formulario from '../components/Formulario.jsx'
import './Productos.css'

const TAMAÑO = 10

function precio(n) {
  return (
    '$ ' +
    Number(n).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [avisoExito, setAvisoExito] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)

  // Filtros
  const [buscar, setBuscar] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [bajoMinimo, setBajoMinimo] = useState(false)

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEnEdicion, setProductoEnEdicion] = useState(null)

  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false)
  const [productoParaIngreso, setProductoParaIngreso] = useState(null)

  const cargarRelaciones = useCallback(async () => {
    try {
      const [resCat, resProv] = await Promise.all([
        http.get('/categorias'),
        http.get('/proveedores'),
      ])
      setCategorias(resCat.data)
      setProveedores(resProv.data)
    } catch {
      // Si falla la carga de relaciones no bloquea el listado
    }
  }, [])

  const cargar = useCallback(
    async (nueva = 1) => {
      setCargando(true)
      setError(null)
      try {
        const params = { page: nueva, size: TAMAÑO }
        if (buscar.trim()) params.buscar = buscar.trim()
        if (categoriaId) params.categoria_id = Number(categoriaId)
        if (proveedorId) params.proveedor_id = Number(proveedorId)
        if (bajoMinimo) params.bajo_minimo = true

        const { data } = await http.get('/productos', { params })
        setProductos(data.items)
        setPagina(data.page)
        setPaginas(Math.max(1, Math.ceil(data.total / data.size)))
      } catch (err) {
        setError(mensajeDeError(err))
      } finally {
        setCargando(false)
      }
    },
    [buscar, categoriaId, proveedorId, bajoMinimo]
  )

  useEffect(() => {
    cargarRelaciones()
  }, [cargarRelaciones])

  useEffect(() => {
    cargar(1)
  }, [cargar])

  function abrirCrear() {
    setProductoEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    setProductoEnEdicion(p)
    setModalAbierto(true)
  }

  function abrirIngreso(p) {
    setProductoParaIngreso(p)
    setModalIngresoAbierto(true)
  }

  async function guardarProducto(datos) {
    const payload = {
      nombre: datos.nombre,
      presentacion: datos.presentacion,
      precio: Number(datos.precio),
      stock_minimo: Number(datos.stock_minimo),
      categoria_id: Number(datos.categoria_id),
      proveedor_id: Number(datos.proveedor_id),
    }

    if (productoEnEdicion) {
      await http.put(`/productos/${productoEnEdicion.id}`, payload)
      setAvisoExito(`Producto "${datos.nombre}" actualizado.`)
    } else {
      await http.post('/productos', payload)
      setAvisoExito(`Producto "${datos.nombre}" creado exitosamente.`)
    }
    setModalAbierto(false)
    await cargar(pagina)
  }

  async function guardarIngreso(datos) {
    await http.post(`/productos/${productoParaIngreso.id}/ingresos`, {
      cantidad: Number(datos.cantidad),
      observacion: datos.observacion ? datos.observacion.trim() : null,
    })
    setAvisoExito(
      `Ingreso registrado: se sumaron ${datos.cantidad} unidades a "${productoParaIngreso.nombre}".`
    )
    setModalIngresoAbierto(false)
    await cargar(pagina)
  }

  async function eliminarProducto(p) {
    if (!window.confirm(`¿Seguro que deseás eliminar el producto "${p.nombre}"?`)) {
      return
    }
    setError(null)
    setAvisoExito(null)
    try {
      await http.delete(`/productos/${p.id}`)
      setAvisoExito(`Producto "${p.nombre}" eliminado.`)
      await cargar(pagina)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const camposProducto = [
    {
      nombre: 'nombre',
      etiqueta: 'Nombre',
      tipo: 'text',
      requerido: true,
      min: 2,
      max: 80,
      placeholder: 'Ej: Coca-Cola',
    },
    {
      nombre: 'presentacion',
      etiqueta: 'Presentación',
      tipo: 'text',
      requerido: true,
      min: 2,
      max: 50,
      placeholder: 'Ej: 2.25L x6',
    },
    {
      nombre: 'categoria_id',
      etiqueta: 'Categoría',
      tipo: 'select',
      requerido: true,
      opciones: [
        { valor: '', texto: '-- Seleccionar Categoría --' },
        ...categorias.map((c) => ({ valor: c.id, texto: c.nombre })),
      ],
    },
    {
      nombre: 'proveedor_id',
      etiqueta: 'Proveedor',
      tipo: 'select',
      requerido: true,
      opciones: [
        { valor: '', texto: '-- Seleccionar Proveedor --' },
        ...proveedores.map((pr) => ({ valor: pr.id, texto: pr.razon_social })),
      ],
    },
    {
      nombre: 'precio',
      etiqueta: 'Precio ($)',
      tipo: 'number',
      requerido: true,
      placeholder: 'Ej: 12500',
    },
    {
      nombre: 'stock_minimo',
      etiqueta: 'Stock mínimo',
      tipo: 'number',
      requerido: true,
      placeholder: 'Ej: 20',
    },
  ]

  const camposIngreso = [
    {
      nombre: 'cantidad',
      etiqueta: 'Cantidad a ingresar',
      tipo: 'number',
      requerido: true,
      placeholder: 'Ej: 50',
    },
    {
      nombre: 'observacion',
      etiqueta: 'Observación / Remito',
      tipo: 'text',
      requerido: false,
      max: 200,
      placeholder: 'Ej: Remito 0001-00004521',
    },
  ]

  const columnas = [
    { clave: 'nombre', titulo: 'Producto' },
    { clave: 'presentacion', titulo: 'Presentación' },
    { clave: 'categoria', titulo: 'Categoría', render: (p) => p.categoria?.nombre },
    { clave: 'proveedor', titulo: 'Proveedor', render: (p) => p.proveedor?.razon_social },
    { clave: 'precio', titulo: 'Precio', render: (p) => precio(p.precio) },
    {
      clave: 'stock',
      titulo: 'Stock',
      render: (p) =>
        p.stock < p.stock_minimo ? (
          <span className="stock-bajo">
            {p.stock} (bajo mín. {p.stock_minimo})
          </span>
        ) : (
          p.stock
        ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (p) => (
        <div className="fila-acciones">
          <button
            type="button"
            className="btn-ingreso"
            title="Ingreso de mercadería"
            onClick={() => abrirIngreso(p)}
          >
            + Ingreso
          </button>
          <button type="button" className="btn-secundario" onClick={() => abrirEditar(p)}>
            Editar
          </button>
          <button type="button" className="btn-peligro" onClick={() => eliminarProducto(p)}>
            Eliminar
          </button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <header className="productos-cabecera">
        <div>
          <h2>Productos</h2>
          <p>Gestión completa de catálogo, precios, stock y reposición de mercadería.</p>
        </div>
        <button type="button" onClick={abrirCrear}>
          Nuevo producto
        </button>
      </header>

      <div className="filtros-barra">
        <input
          type="text"
          placeholder="Buscar por nombre o presentación…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.razon_social}
            </option>
          ))}
        </select>
        <label className="filtro-checkbox">
          <input
            type="checkbox"
            checked={bajoMinimo}
            onChange={(e) => setBajoMinimo(e.target.checked)}
          />
          <span>Bajo stock mínimo</span>
        </label>
      </div>

      {avisoExito && <p className="aviso-exito">{avisoExito}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={productos}
        cargando={cargando}
        mensajeVacio="No se encontraron productos."
        paginacion={{ pagina, paginas, onPagina: cargar }}
      />

      {/* Modal Crear / Editar Producto */}
      <Modal
        abierto={modalAbierto}
        titulo={productoEnEdicion ? 'Editar producto' : 'Nuevo producto'}
        onCerrar={() => setModalAbierto(false)}
      >
        <Formulario
          key={productoEnEdicion ? productoEnEdicion.id : 'nuevo'}
          campos={camposProducto}
          valoresIniciales={
            productoEnEdicion
              ? {
                  nombre: productoEnEdicion.nombre,
                  presentacion: productoEnEdicion.presentacion,
                  categoria_id: productoEnEdicion.categoria?.id || '',
                  proveedor_id: productoEnEdicion.proveedor?.id || '',
                  precio: productoEnEdicion.precio,
                  stock_minimo: productoEnEdicion.stock_minimo,
                }
              : { categoria_id: '', proveedor_id: '', stock_minimo: 10 }
          }
          enEnviar={guardarProducto}
          etiquetaEnviar={productoEnEdicion ? 'Guardar cambios' : 'Crear'}
        />
      </Modal>

      {/* Modal Ingreso de Mercadería */}
      <Modal
        abierto={modalIngresoAbierto}
        titulo={`Ingreso de mercadería: ${productoParaIngreso?.nombre || ''}`}
        onCerrar={() => setModalIngresoAbierto(false)}
      >
        <Formulario
          key={`ingreso-${productoParaIngreso?.id}`}
          campos={camposIngreso}
          valoresIniciales={{ cantidad: 10, observacion: '' }}
          enEnviar={guardarIngreso}
          etiquetaEnviar="Confirmar ingreso"
        />
      </Modal>
    </section>
  )
}
