import { useContext } from 'react'
import { AuthContext } from './AuthContext.js'

/** Devuelve { usuario, token, login, logout } de la sesión actual. */
export function useAuth() {
  const contexto = useContext(AuthContext)
  if (contexto === null) {
    throw new Error('useAuth se usa dentro de <AuthProvider>.')
  }
  return contexto
}
