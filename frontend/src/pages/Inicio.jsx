import { useState } from 'react'
import { esError401, http } from '../api/cliente.js'
import PaginaPlaceholder from '../components/PaginaPlaceholder.jsx'

export default function Inicio() {
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function probarRedirect401() {
    setMensaje(null)
    setCargando(true)
    try {
      await http.get('/auth/me')
      setMensaje('La respuesta fue OK: hay una sesión válida.')
    } catch (error) {
      if (esError401(error)) {
        setMensaje('Llegó un 401: te estamos redirigiendo al login…')
      } else {
        setMensaje(
          'No se pudo llamar a la API (¿está levantada en el puerto 8000?).',
        )
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <PaginaPlaceholder
        titulo="Dashboard"
        descripcion="Indicadores de ventas, pedidos pendientes y stock bajo; con datos de la API."
        tarea="Se construye en la tarea F6."
      />
      <div className="prueba401">
        <button type="button" onClick={probarRedirect401} disabled={cargando}>
          Probar redirect por 401
        </button>
        {mensaje && <p>{mensaje}</p>}
      </div>
    </>
  )
}
