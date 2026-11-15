import { AxiosError } from 'axios'

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá que la API esté levantada.'
const GENERICO = 'Error inesperado. Intentá de nuevo.'

/** Texto para mostrar al usuario a partir de un error de axios o de cualquier otro. */
export function mensajeDeError(error) {
  if (error instanceof AxiosError) {
    if (!error.response) return SIN_CONEXION
    return error.response.data?.error?.message ?? GENERICO
  }
  return GENERICO
}
