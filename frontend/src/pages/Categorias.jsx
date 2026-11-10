import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import { getUsuario } from '../api/sesion.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import Formulario from '../components/Formulario.jsx'
import './Categorias.css'

const CAMPOS_CATEGORIA = [
  {
    nombre: 'nombre',
    etiqueta: 'Nombre',
    tipo: 'text',
    requerido: true,
    min: 2,
    max: 50,
    placeholder: 'Ej: Gaseosas',
  },
]

export default function Categorias() {
  const usuario = getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState(null)
  const [avisoExito, setAvisoExito] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get('/categorias')
      setCategorias(data)
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
    setCategoriaEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirEditar(categoria) {
    setCategoriaEnEdicion(categoria)
    setModalAbierto(true)
  }

  async function guardar(datos) {
    if (categoriaEnEdicion) {
      await http.put(`/categorias/${categoriaEnEdicion.id}`, datos)
      setAvisoExito(`Categoría "${datos.nombre}" actualizada.`)
    } else {
      await http.post('/categorias', datos)
      setAvisoExito(`Categoría "${datos.nombre}" creada.`)
    }
    setModalAbierto(false)
    await cargar()
  }

  async function eliminar(categoria) {
    if (!window.confirm(`¿Seguro que deseás eliminar la categoría "${categoria.nombre}"?`)) {
      return
    }
    setError(null)
    setAvisoExito(null)
    try {
      await http.delete(`/categorias/${categoria.id}`)
      setAvisoExito(`Categoría "${categoria.nombre}" eliminada.`)
      await cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'nombre', titulo: 'Nombre' },
    ...(esAdmin
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (cat) => (
              <div className="fila-acciones">
                <button type="button" className="btn-secundario" onClick={() => abrirEditar(cat)}>
                  Editar
                </button>
                <button type="button" className="btn-peligro" onClick={() => eliminar(cat)}>
                  Eliminar
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <section>
      <header className="categorias-cabecera">
        <div>
          <h2>Categorías</h2>
          <p>Gestión de categorías para clasificación de productos.</p>
        </div>
        {esAdmin && (
          <button type="button" onClick={abrirCrear}>
            Nueva categoría
          </button>
        )}
      </header>

      {avisoExito && <p className="aviso-exito">{avisoExito}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={categorias}
        cargando={cargando}
        mensajeVacio="No hay categorías cargadas."
      />

      <Modal
        abierto={modalAbierto}
        titulo={categoriaEnEdicion ? 'Editar categoría' : 'Nueva categoría'}
        onCerrar={() => setModalAbierto(false)}
      >
        <Formulario
          key={categoriaEnEdicion ? categoriaEnEdicion.id : 'nueva'}
          campos={CAMPOS_CATEGORIA}
          valoresIniciales={categoriaEnEdicion ? { nombre: categoriaEnEdicion.nombre } : {}}
          enEnviar={guardar}
          etiquetaEnviar={categoriaEnEdicion ? 'Guardar cambios' : 'Crear'}
        />
      </Modal>
    </section>
  )
}

