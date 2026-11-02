import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import Formulario from '../components/Formulario.jsx'
import './Clientes.css'

const PATRON_CUIT = '^\\d{2}-\\d{8}-\\d$'
const TAMAÑO = 10

const ZONAS = [
  { valor: 'Centro', texto: 'Centro' },
  { valor: 'Norte', texto: 'Norte' },
  { valor: 'Sur', texto: 'Sur' },
]

const CAMPOS_CLIENTE = [
  {
    nombre: 'razon_social',
    etiqueta: 'Razón Social',
    tipo: 'text',
    requerido: true,
    min: 2,
    max: 120,
    placeholder: 'Ej: Almacén Don Pepe',
  },
  {
    nombre: 'cuit',
    etiqueta: 'CUIT',
    tipo: 'text',
    requerido: true,
    patron: PATRON_CUIT,
    mensajePatron: 'El CUIT debe tener el formato XX-XXXXXXXX-X.',
    placeholder: '20-28765432-1',
  },
  {
    nombre: 'zona',
    etiqueta: 'Zona',
    tipo: 'select',
    requerido: true,
    opciones: ZONAS,
  },
  {
    nombre: 'direccion',
    etiqueta: 'Dirección',
    tipo: 'text',
    requerido: true,
    min: 2,
    max: 150,
    placeholder: 'San Martín 1234',
  },
  {
    nombre: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'text',
    requerido: false,
    max: 50,
    placeholder: '342-155667788',
  },
]

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [zonaFiltro, setZonaFiltro] = useState('')
  const [buscar, setBuscar] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEnEdicion, setClienteEnEdicion] = useState(null)
  const [avisoExito, setAvisoExito] = useState(null)

  const cargar = useCallback(async (nuevaPagina = 1) => {
    setCargando(true)
    setError(null)
    try {
      const params = { page: nuevaPagina, size: TAMAÑO }
      if (zonaFiltro) params.zona = zonaFiltro
      if (buscar.trim()) params.buscar = buscar.trim()

      const { data } = await http.get('/clientes', { params })
      setClientes(data.items)
      setPagina(data.page)
      setPaginas(Math.max(1, Math.ceil(data.total / data.size)))
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [zonaFiltro, buscar])

  useEffect(() => {
    cargar(1)
  }, [cargar])

  function abrirCrear() {
    setClienteEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirEditar(c) {
    setClienteEnEdicion(c)
    setModalAbierto(true)
  }

  async function guardar(datos) {
    if (clienteEnEdicion) {
      await http.put(`/clientes/${clienteEnEdicion.id}`, datos)
      setAvisoExito(`Cliente "${datos.razon_social}" actualizado.`)
    } else {
      await http.post('/clientes', datos)
      setAvisoExito(`Cliente "${datos.razon_social}" creado.`)
    }
    setModalAbierto(false)
    await cargar(pagina)
  }

  async function eliminar(c) {
    if (!window.confirm(`¿Seguro que deseás eliminar al cliente "${c.razon_social}"?`)) {
      return
    }
    setError(null)
    setAvisoExito(null)
    try {
      await http.delete(`/clientes/${c.id}`)
      setAvisoExito(`Cliente "${c.razon_social}" eliminado.`)
      await cargar(pagina)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'razon_social', titulo: 'Razón Social' },
    { clave: 'cuit', titulo: 'CUIT' },
    { clave: 'zona', titulo: 'Zona' },
    { clave: 'direccion', titulo: 'Dirección', render: (c) => c.direccion || '-' },
    { clave: 'telefono', titulo: 'Teléfono', render: (c) => c.telefono || '-' },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (c) => (
        <div className="fila-acciones">
          <button type="button" className="btn-secundario" onClick={() => abrirEditar(c)}>
            Editar
          </button>
          <button type="button" className="btn-peligro" onClick={() => eliminar(c)}>
            Eliminar
          </button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <header className="clientes-cabecera">
        <div>
          <h2>Clientes</h2>
          <p>ABM de clientes por zona (Centro, Norte, Sur) con búsqueda y filtros.</p>
        </div>
        <button type="button" onClick={abrirCrear}>
          Nuevo cliente
        </button>
      </header>

      <div className="filtros-barra">
        <input
          type="text"
          placeholder="Buscar por razón social o CUIT…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <select value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
          <option value="">Todas las zonas</option>
          <option value="Centro">Centro</option>
          <option value="Norte">Norte</option>
          <option value="Sur">Sur</option>
        </select>
      </div>

      {avisoExito && <p className="aviso-exito">{avisoExito}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={clientes}
        cargando={cargando}
        mensajeVacio="No se encontraron clientes."
        paginacion={{ pagina, paginas, onPagina: cargar }}
      />

      <Modal
        abierto={modalAbierto}
        titulo={clienteEnEdicion ? 'Editar cliente' : 'Nuevo cliente'}
        onCerrar={() => setModalAbierto(false)}
      >
        <Formulario
          key={clienteEnEdicion ? clienteEnEdicion.id : 'nuevo'}
          campos={CAMPOS_CLIENTE}
          valoresIniciales={
            clienteEnEdicion
              ? {
                  razon_social: clienteEnEdicion.razon_social,
                  cuit: clienteEnEdicion.cuit,
                  zona: clienteEnEdicion.zona,
                  direccion: clienteEnEdicion.direccion || '',
                  telefono: clienteEnEdicion.telefono || '',
                }
              : { zona: 'Centro' }
          }
          enEnviar={guardar}
          etiquetaEnviar={clienteEnEdicion ? 'Guardar cambios' : 'Crear'}
        />
      </Modal>
    </section>
  )
}
