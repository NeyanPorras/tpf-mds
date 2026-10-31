import { Navigate, Outlet } from 'react-router-dom'
import { getUsuario } from '../api/sesion.js'
import { rolPuedeVer } from '../api/permisos.js'

/**
 * Guarda de ruta: sin sesión manda al login, y con sesión pero con un rol
 * que no corresponde, de vuelta al inicio.
 *
 * Con `to` se valida contra permisos.js (mismo mapa que el menú); sin `to`
 * solo exige estar logueado. El 403 definitivo lo da la API de todos modos.
 */
export default function ProtegerRuta({ to }) {
  const usuario = getUsuario()
  if (usuario === null) {
    return <Navigate to="/login" replace />
  }
  if (!rolPuedeVer(usuario.rol, to)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
