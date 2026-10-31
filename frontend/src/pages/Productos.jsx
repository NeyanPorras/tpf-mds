import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import Tabla from '../components/Tabla.jsx'
import './Productos.css'

const TAMAÑO = 10

function precio(n) {
  return '$ ' + Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const COLUMNAS = [
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
          {p.stock} (bajo mínimo)
        </span>
      ) : (
        p.stock
      ),
  },
]

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)

  const cargar = useCallback(async (nueva) => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get('/productos', {
        params: { page: nueva, size: TAMAÑO },
      })
      setProductos(data.items)
      setPagina(data.page)
      setPaginas(Math.max(1, Math.ceil(data.total / data.size)))
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(1)
  }, [cargar])

  return (
    <section>
      <header className="productos-cabecera">
        <h2>Productos</h2>
        <p>
          Listado real de la base de datos. El ABM completo (crear, editar,
          ingresos de mercadería) se construye en la tarea F4 con estos mismos
          componentes.
        </p>
      </header>

      {error ? (
        <p className="aviso-error">{error}</p>
      ) : (
        <Tabla
          columnas={COLUMNAS}
          filas={productos}
          cargando={cargando}
          mensajeVacio="No hay productos cargados."
          paginacion={{ pagina, paginas, onPagina: cargar }}
        />
      )}
    </section>
  )
}
