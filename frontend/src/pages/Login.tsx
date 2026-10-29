import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { http, mensajeDeError } from '../api/cliente.ts'
import { guardarSesion } from '../api/sesion.ts'
import type { RespuestaLogin } from '../api/tipos.ts'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError(null)
    setCargando(true)

    const datos = new FormData(evento.currentTarget)
    try {
      const { data } = await http.post<RespuestaLogin>('/auth/login', {
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
          El login real se termina en la tarea F2; mientras, se usa la API si ya
          está levantada.
        </p>
      </form>
    </main>
  )
}
