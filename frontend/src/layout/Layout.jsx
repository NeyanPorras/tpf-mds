import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getUsuario, limpiarSesion } from '../api/sesion.js'
import { seccionesDeMenu } from '../api/permisos.js'
import './Layout.css'

export default function Layout() {
  const navigate = useNavigate()
  const usuario = getUsuario()

  function salir() {
    limpiarSesion()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="barra">
        <div className="marca">
          <h1>Distribuidora</h1>
        </div>
        <nav>
          {/* Cada rol ve solo su menú (tabla "Permisos por rol" del contrato). */}
          {(usuario ? seccionesDeMenu(usuario.rol) : []).map((seccion) => (
            <NavLink
              key={seccion.to}
              to={seccion.to}
              end={seccion.to === '/'}
              className={({ isActive }) => (isActive ? 'activo' : '')}
            >
              {seccion.texto}
            </NavLink>
          ))}
        </nav>
        <div className="pie">
          {usuario ? (
            <>
              <span>
                {usuario.nombre} <span className="rol">{usuario.rol}</span>
              </span>
              <button type="button" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <span>Sin sesión activa</span>
          )}
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
