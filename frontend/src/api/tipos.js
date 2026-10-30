// Valores y formas de datos tomados de docs/contrato-api.md.
// Si un JSON cambia en el contrato, se cambia acá (y en el backend) en el mismo PR.

export const ROLES = Object.freeze(['ADMIN', 'VENDEDOR', 'DEPOSITO'])

export const ESTADOS_PEDIDO = Object.freeze([
  'PENDIENTE',
  'CONFIRMADO',
  'ENTREGADO',
  'CANCELADO',
])

/**
 * @typedef {Object} Usuario
 * @property {number} id
 * @property {string} nombre
 * @property {string} email
 * @property {'ADMIN' | 'VENDEDOR' | 'DEPOSITO'} rol
 * @property {boolean} [activo]
 */

/**
 * @typedef {Object} RespuestaLogin
 * @property {string} access_token
 * @property {string} token_type
 * @property {number} expires_in
 * @property {Usuario} usuario
 */
