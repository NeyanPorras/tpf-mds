import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { http, mensajeDeError } from '../api/cliente.js'
import { getUsuario, guardarSesion } from '../api/sesion.js'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  // Con sesión activa el login no agenda nada: directo al inicio.
  if (getUsuario() !== null) {
    return <Navigate to="/" replace />
  }

  async function enviar(evento) {
    evento.preventDefault()
    setError(null)
    setCargando(true)

    const datos = new FormData(evento.currentTarget)
    try {
      const { data } = await http.post('/auth/login', {
        email: String(datos.get('email') ?? ''),
        password: String(datos.get('password') ?? ''),
      })
      guardarSesion(data.access_token, data.usuario)
      navigate('/')
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="login">
      <form onSubmit={enviar}>
        <h1>Distribuidora de bebidas</h1>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Contraseña
          <input type="password" name="password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="nota">
          El menú y las rutas se adaptan al rol: Productos y Pedidos para
          todos, Clientes solo para ventas, Usuarios solo para administración.
        </p>
      </form>
    </main>
  )
}
