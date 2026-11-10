import { createContext } from 'react'

/**
 * Sesión del usuario compartida por toda la app.
 * El valor lo da <AuthProvider> y se lee con useAuth().
 *
 * @type {import('react').Context<{
 *   usuario: import('../api/tipos.js').Usuario | null,
 *   token: string | null,
 *   login: (token: string, usuario: import('../api/tipos.js').Usuario) => void,
 *   logout: () => void,
 * } | null>}
 */
export const AuthContext = createContext(null)
