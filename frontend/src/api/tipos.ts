// Tipos extraídos de docs/contrato-api.md. Si un JSON cambia en el contrato,
// se cambia acá (y en el backend) en el mismo PR.

export type Rol = 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'

export type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'ENTREGADO'
  | 'CANCELADO'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
  activo?: boolean
}

export interface RespuestaLogin {
  access_token: string
  token_type: string
  expires_in: number
  usuario: Usuario
}

export interface ErrorApi {
  code: string
  message: string
  details: unknown
}
