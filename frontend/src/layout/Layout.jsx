import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getUsuario, limpiarSesion } from '../api/sesion.js'
import './Layout.css'

const LINKS = [
  { to: '/', texto: 'Inicio' },
  { to: '/productos', texto: 'Productos' },
  { to: '/clientes', texto: 'Clientes' },
  { to: '/pedidos', texto: 'Pedidos' },
  { to: '/reportes', texto: 'Reportes' },
]

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
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'activo' : '')}
            >
              {link.texto}
            </NavLink>
          ))}
        </nav>
        <div className="pie">
          {usuario ? (
            <>
              <span>{usuario.nombre}</span>
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
