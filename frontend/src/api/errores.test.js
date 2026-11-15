import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { mensajeDeError } from './errores.js'

test('sin respuesta del servidor, avisa que no se pudo conectar', () => {
  const error = new AxiosError('Network Error', AxiosError.ERR_NETWORK)
  assert.equal(
    mensajeDeError(error),
    'No se pudo conectar con el servidor. Revisá que la API esté levantada.'
  )
})

test('con respuesta de la API, usa su mensaje', () => {
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 401,
    data: { error: { code: 'NO_AUTENTICADO', message: 'Email o contraseña incorrectos.' } },
  })
  assert.equal(mensajeDeError(error), 'Email o contraseña incorrectos.')
})

test('respuesta sin el formato de error de la API, mensaje genérico', () => {
  const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 500,
    data: 'Internal Server Error',
  })
  assert.equal(mensajeDeError(error), 'Error inesperado. Intentá de nuevo.')
})
