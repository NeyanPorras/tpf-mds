import type { Usuario } from './tipos.ts'

const CLAVE_TOKEN = 'access_token'
const CLAVE_USUARIO = 'usuario'

export function getToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN)
}

export function getUsuario(): Usuario | null {
  const crudo = localStorage.getItem(CLAVE_USUARIO)
  if (crudo === null) {
    return null
  }
  try {
    return JSON.parse(crudo) as Usuario
  } catch {
    limpiarSesion()
    return null
  }
}

export function guardarSesion(token: string, usuario: Usuario): void {
  localStorage.setItem(CLAVE_TOKEN, token)
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}

export function limpiarSesion(): void {
  localStorage.removeItem(CLAVE_TOKEN)
  localStorage.removeItem(CLAVE_USUARIO)
}
