import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import Formulario from '../components/Formulario.jsx'
import './Proveedores.css'

const PATRON_CUIT = '^\\d{2}-\\d{8}-\\d$'

const CAMPOS_PROVEEDOR = [
  {
    nombre: 'razon_social',
    etiqueta: 'Razón Social',
    tipo: 'text',
    requerido: true,
    min: 2,
    max: 120,
    placeholder: 'Ej: Distribuidora Norte S.R.L.',
  },
  {
    nombre: 'cuit',
    etiqueta: 'CUIT',
    tipo: 'text',
    requerido: true,
    patron: PATRON_CUIT,
    mensajePatron: 'El CUIT debe tener el formato XX-XXXXXXXX-X.',
    placeholder: '30-71234567-8',
  },
  {
    nombre: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'text',
    requerido: false,
    max: 50,
    placeholder: '0342-4551234',
  },
  {
    nombre: 'email',
    etiqueta: 'Email',
    tipo: 'email',
    requerido: false,
    max: 100,
    placeholder: 'contacto@proveedor.com',
  },
]

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [proveedorEnEdicion, setProveedorEnEdicion] = useState(null)
  const [avisoExito, setAvisoExito] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get('/proveedores')
      setProveedores(data)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  function abrirCrear() {
    setProveedorEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirEditar(prov) {
    setProveedorEnEdicion(prov)
    setModalAbierto(true)
  }

  async function guardar(datos) {
    if (proveedorEnEdicion) {
      await http.put(`/proveedores/${proveedorEnEdicion.id}`, datos)
      setAvisoExito(`Proveedor "${datos.razon_social}" actualizado.`)
    } else {
      await http.post('/proveedores', datos)
      setAvisoExito(`Proveedor "${datos.razon_social}" creado.`)
    }
    setModalAbierto(false)
    await cargar()
  }

  async function eliminar(prov) {
    if (!window.confirm(`¿Seguro que deseás eliminar al proveedor "${prov.razon_social}"?`)) {
      return
    }
    setError(null)
    setAvisoExito(null)
    try {
      await http.delete(`/proveedores/${prov.id}`)
      setAvisoExito(`Proveedor "${prov.razon_social}" eliminado.`)
      await cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'razon_social', titulo: 'Razón Social' },
    { clave: 'cuit', titulo: 'CUIT' },
    { clave: 'telefono', titulo: 'Teléfono', render: (p) => p.telefono || '-' },
    { clave: 'email', titulo: 'Email', render: (p) => p.email || '-' },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (prov) => (
        <div className="fila-acciones">
          <button type="button" className="btn-secundario" onClick={() => abrirEditar(prov)}>
            Editar
          </button>
          <button type="button" className="btn-peligro" onClick={() => eliminar(prov)}>
            Eliminar
          </button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <header className="proveedores-cabecera">
        <div>
          <h2>Proveedores</h2>
          <p>Gestión de proveedores comerciales.</p>
        </div>
        <button type="button" onClick={abrirCrear}>
          Nuevo proveedor
        </button>
      </header>

      {avisoExito && <p className="aviso-exito">{avisoExito}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={proveedores}
        cargando={cargando}
        mensajeVacio="No hay proveedores cargados."
      />

      <Modal
        abierto={modalAbierto}
        titulo={proveedorEnEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
        onCerrar={() => setModalAbierto(false)}
      >
        <Formulario
          key={proveedorEnEdicion ? proveedorEnEdicion.id : 'nuevo'}
          campos={CAMPOS_PROVEEDOR}
          valoresIniciales={
            proveedorEnEdicion
              ? {
                  razon_social: proveedorEnEdicion.razon_social,
                  cuit: proveedorEnEdicion.cuit,
                  telefono: proveedorEnEdicion.telefono || '',
                  email: proveedorEnEdicion.email || '',
                }
              : {}
          }
          enEnviar={guardar}
          etiquetaEnviar={proveedorEnEdicion ? 'Guardar cambios' : 'Crear'}
        />
      </Modal>
    </section>
  )
}

