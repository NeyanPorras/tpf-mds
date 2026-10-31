import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import Tabla from '../components/Tabla.jsx'
import Modal from '../components/Modal.jsx'
import Formulario from '../components/Formulario.jsx'
import './Demo.css'

const CAMPOS_CATEGORIA = [
  {
    nombre: 'nombre',
    etiqueta: 'Nombre',
    tipo: 'text',
    requerido: true,
    min: 2,
    max: 50,
    placeholder: 'Ej: Cervezas artesanales',
  },
]

export default function Demo() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [aviso, setAviso] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await http.get('/categorias')
      setCategorias(data)
    } catch (error) {
      setAviso(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function crearCategoria(datos) {
    await http.post('/categorias', datos)
    setModalAbierto(false)
    setAviso(`Categoría "${datos.nombre}" creada.`)
    await cargar()
  }

  return (
    <section>
      <header className="demo-cabecera">
        <div>
          <h2>Componentes</h2>
          <p>
            Guía viva de los componentes reutilizables (F3) contra la API real:
            tabla con paginación, modal y formulario con validación. Van a ser
            la base de los ABMs (F4), pedidos (F5) y reportes (F7).
          </p>
        </div>
        <button type="button" onClick={() => setModalAbierto(true)}>
          Nueva categoría
        </button>
      </header>

      {aviso && <p className="aviso-error">{aviso}</p>}

      <Tabla
        columnas={[
          { clave: 'id', titulo: 'ID' },
          { clave: 'nombre', titulo: 'Categoría' },
        ]}
        filas={categorias}
        cargando={cargando}
        mensajeVacio="Sin categorías."
      />

      <aside className="demo-usos">
        <h4>Qué demuestra cada caso</h4>
        <ul>
          <li>
            <strong>Tabla:</strong> carga real con `GET /categorias` y estado
            vacío/cargando.
          </li>
          <li>
            <strong>Modal:</strong> se cierra con la cruz, con Escape o clic en
            el fondo.
          </li>
          <li>
            <strong>Formulario:</strong> valida antes de enviar (2–50
            caracteres) y sabe mostrar los errores del backend (422 por campo,
            409 de duplicado con su mensaje).
          </li>
        </ul>
      </aside>

      <Modal abierto={modalAbierto} titulo="Nueva categoría" onCerrar={() => setModalAbierto(false)}>
        <Formulario campos={CAMPOS_CATEGORIA} enEnviar={crearCategoria} etiquetaEnviar="Crear" />
      </Modal>
    </section>
  )
}
