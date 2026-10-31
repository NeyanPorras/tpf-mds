// Menú y guardas de rutas por rol, según "Permisos por rol" de
// docs/contrato-api.md. Si cambia la tabla del contrato, se cambia acá
// (y en la tabla) en el mismo PR.
import { ROLES } from './tipos.js'

const TODOS = ROLES

// Secciones visibles en la barra lateral. La ruta /usuarios todavía es un
// placeholder (ABM de usuarios, tarea de backend pendiente) y solo la ve ADMIN.
export const SECCIONES = Object.freeze([
  { to: '/', texto: 'Inicio', roles: TODOS },
  { to: '/productos', texto: 'Productos', roles: TODOS },
  { to: '/clientes', texto: 'Clientes', roles: ['ADMIN', 'VENDEDOR'] },
  { to: '/pedidos', texto: 'Pedidos', roles: TODOS },
  { to: '/reportes', texto: 'Reportes', roles: TODOS },
  { to: '/usuarios', texto: 'Usuarios', roles: ['ADMIN'] },
  { to: '/demo', texto: 'Componentes', roles: TODOS },
])

/** Links que ve un rol en el menú: exactamente su rebanada de la API. */
export function seccionesDeMenu(rol) {
  return SECCIONES.filter((seccion) => seccion.roles.includes(rol))
}

/** True si el rol puede entrar directo (URL escrita a mano) a esa ruta. */
export function rolPuedeVer(rol, to) {
  const seccion = SECCIONES.find((item) => item.to === to)
  // Rutas que no figuran en el menú (por ejemplo /login) quedan abiertas:
  // el 403 definitivo lo da la API con require_role.
  return seccion === undefined || seccion.roles.includes(rol)
}
