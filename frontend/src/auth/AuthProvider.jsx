import { useCallback, useMemo, useState } from 'react'
import { getToken, getUsuario, guardarSesion, limpiarSesion } from '../api/sesion.js'
import { AuthContext } from './AuthContext.js'

/**
 * Guarda la sesión en el estado de React y la comparte con useContext.
 *
 * localStorage (vía sesion.js) solo sirve para que la sesión sobreviva al
 * recargar la página: al arrancar, el estado se carga desde ahí.
 */
export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => {
    const usuario = getUsuario()
    const token = getToken()
    return usuario && token ? { usuario, token } : { usuario: null, token: null }
  })

  const login = useCallback((token, usuario) => {
    guardarSesion(token, usuario)
    setSesion({ usuario, token })
  }, [])

  const logout = useCallback(() => {
    limpiarSesion()
    setSesion({ usuario: null, token: null })
  }, [])

  const valor = useMemo(() => ({ ...sesion, login, logout }), [sesion, login, logout])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
