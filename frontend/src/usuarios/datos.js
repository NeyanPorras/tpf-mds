// Reglas de la pantalla de usuarios que no dependen de React.

// Política del contrato: mínimo 8 caracteres con al menos un número.
export const PATRON_PASSWORD = '^(?=.*\\d).{8,72}$'
export const MENSAJE_PASSWORD = 'Mínimo 8 caracteres y al menos un número.'

/**
 * Body para POST o PUT /usuarios a partir de lo cargado en el formulario.
 * Al editar, una contraseña vacía significa "no cambiarla", así que no se
 * manda; tampoco se manda el rol cuando el formulario no lo muestra.
 */
export function armarPayload(datos, enEdicion) {
  const payload = {
    nombre: String(datos.nombre ?? '').trim(),
    email: String(datos.email ?? '').trim().toLowerCase(),
  }
  if (datos.rol) payload.rol = datos.rol
  const password = String(datos.password ?? '')
  if (!enEdicion || password !== '') payload.password = password
  return payload
}
