const CLAVE_TOKEN = 'access_token'
const CLAVE_USUARIO = 'usuario'

export function getToken() {
  return localStorage.getItem(CLAVE_TOKEN)
}

/** @returns {import('./tipos.js').Usuario | null} */
export function getUsuario() {
  const crudo = localStorage.getItem(CLAVE_USUARIO)
  if (crudo === null) {
    return null
  }
  try {
    return JSON.parse(crudo)
  } catch {
    limpiarSesion()
    return null
  }
}

export function guardarSesion(token, usuario) {
  localStorage.setItem(CLAVE_TOKEN, token)
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}

export function limpiarSesion() {
  localStorage.removeItem(CLAVE_TOKEN)
  localStorage.removeItem(CLAVE_USUARIO)
}
