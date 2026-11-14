import { useCallback, useEffect, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import { ROLES } from '../api/tipos.js'
import { useAuth } from '../auth/useAuth.js'
import Formulario from '../components/Formulario.jsx'
import Modal from '../components/Modal.jsx'
import Tabla from '../components/Tabla.jsx'
import { MENSAJE_PASSWORD, PATRON_PASSWORD, armarPayload } from '../usuarios/datos.js'
import './Usuarios.css'

const TAMAÑO = 10
const PATRON_EMAIL = '^\\S+@\\S+\\.\\S+$'

const CAMPO_NOMBRE = {
  nombre: 'nombre',
  etiqueta: 'Nombre',
  tipo: 'text',
  requerido: true,
  min: 2,
  max: 80,
  placeholder: 'Ej: Valen Vendedor',
}
const CAMPO_EMAIL = {
  nombre: 'email',
  etiqueta: 'Email',
  tipo: 'email',
  requerido: true,
  max: 120,
  patron: PATRON_EMAIL,
  mensajePatron: 'Ingresá un email válido.',
  placeholder: 'nombre@distribuidora.com',
}
const CAMPO_ROL = {
  nombre: 'rol',
  etiqueta: 'Rol',
  tipo: 'select',
  requerido: true,
  opciones: ROLES.map((rol) => ({ valor: rol, texto: rol })),
}

function campoPassword(enEdicion) {
  return {
    nombre: 'password',
    etiqueta: enEdicion ? 'Nueva contraseña' : 'Contraseña',
    tipo: 'password',
    requerido: !enEdicion,
    patron: PATRON_PASSWORD,
    mensajePatron: MENSAJE_PASSWORD,
    placeholder: enEdicion ? 'Dejala vacía para no cambiarla' : MENSAJE_PASSWORD,
  }
}

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [enEdicion, setEnEdicion] = useState(null)

  const cargar = useCallback(async (nuevaPagina = 1) => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get('/usuarios', { params: { page: nuevaPagina, size: TAMAÑO } })
      setUsuarios(data.items)
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

  function abrir(usuario) {
    setEnEdicion(usuario)
    setAviso(null)
    setModalAbierto(true)
  }

  // El admin no puede quitarse su propio rol: al editarse no se le ofrece.
  const editandoseASiMismo = enEdicion?.id === yo?.id
  const campos = [
    CAMPO_NOMBRE,
    CAMPO_EMAIL,
    campoPassword(Boolean(enEdicion)),
    ...(editandoseASiMismo ? [] : [CAMPO_ROL]),
  ]

  async function guardar(datos) {
    const payload = armarPayload(datos, Boolean(enEdicion))
    if (enEdicion) {
      await http.put(`/usuarios/${enEdicion.id}`, payload)
      setAviso(`Usuario "${payload.nombre}" actualizado.`)
    } else {
      await http.post('/usuarios', payload)
      setAviso(`Usuario "${payload.nombre}" creado.`)
    }
    setModalAbierto(false)
    await cargar(pagina)
  }

  async function cambiarEstado(usuario) {
    const desactivar = usuario.activo
    const pregunta = desactivar
      ? `¿Desactivar a "${usuario.nombre}"? No va a poder ingresar y su sesión se cierra.`
      : `¿Reactivar a "${usuario.nombre}"?`
    if (!window.confirm(pregunta)) return
    setError(null)
    setAviso(null)
    try {
      if (desactivar) {
        await http.delete(`/usuarios/${usuario.id}`)
      } else {
        await http.put(`/usuarios/${usuario.id}`, { activo: true })
      }
      setAviso(`Usuario "${usuario.nombre}" ${desactivar ? 'desactivado' : 'reactivado'}.`)
      await cargar(pagina)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'nombre', titulo: 'Nombre', render: (u) => (u.id === yo?.id ? `${u.nombre} (vos)` : u.nombre) },
    { clave: 'email', titulo: 'Email' },
    { clave: 'rol', titulo: 'Rol' },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (u) => (
        <span className={`usuario-estado ${u.activo ? 'activo' : 'inactivo'}`}>
          {u.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (u) => (
        <div className="fila-acciones">
          <button type="button" className="btn-secundario" onClick={() => abrir(u)}>
            Editar
          </button>
          {u.id !== yo?.id && (
            <button
              type="button"
              className={u.activo ? 'btn-peligro' : 'btn-secundario'}
              onClick={() => cambiarEstado(u)}
            >
              {u.activo ? 'Desactivar' : 'Reactivar'}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <section>
      <header className="usuarios-cabecera">
        <div>
          <h2>Usuarios</h2>
          <p>Alta, edición y desactivación de las cuentas que ingresan al sistema.</p>
        </div>
        <button type="button" onClick={() => abrir(null)}>
          Nuevo usuario
        </button>
      </header>

      {aviso && <p className="aviso-exito">{aviso}</p>}
      {error && <p className="aviso-error">{error}</p>}

      <Tabla
        columnas={columnas}
        filas={usuarios}
        cargando={cargando}
        mensajeVacio="No hay usuarios."
        paginacion={{ pagina, paginas, onPagina: cargar }}
      />

      <Modal
        abierto={modalAbierto}
        titulo={enEdicion ? 'Editar usuario' : 'Nuevo usuario'}
        onCerrar={() => setModalAbierto(false)}
      >
        <Formulario
          key={enEdicion ? enEdicion.id : 'nuevo'}
          campos={campos}
          valoresIniciales={
            enEdicion
              ? { nombre: enEdicion.nombre, email: enEdicion.email, password: '', rol: enEdicion.rol }
              : { rol: 'VENDEDOR' }
          }
          enEnviar={guardar}
          etiquetaEnviar={enEdicion ? 'Guardar cambios' : 'Crear'}
        />
      </Modal>
    </section>
  )
}
