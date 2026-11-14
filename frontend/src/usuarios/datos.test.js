import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MENSAJE_PASSWORD, PATRON_PASSWORD, armarPayload } from './datos.js'

describe('armarPayload', () => {
  it('al crear manda todos los campos, con el email normalizado', () => {
    const datos = { nombre: ' Nico ', email: ' Nico@Distribuidora.com ', password: 'Nuevo1234', rol: 'DEPOSITO' }
    assert.deepEqual(armarPayload(datos, false), {
      nombre: 'Nico',
      email: 'nico@distribuidora.com',
      password: 'Nuevo1234',
      rol: 'DEPOSITO',
    })
  })

  it('al editar, la contraseña vacía no se manda', () => {
    const datos = { nombre: 'Nico', email: 'nico@distribuidora.com', password: '', rol: 'VENDEDOR' }
    assert.equal('password' in armarPayload(datos, true), false)
  })

  it('al editar, una contraseña nueva sí se manda', () => {
    const datos = { nombre: 'Nico', email: 'nico@distribuidora.com', password: 'Otra5678' }
    assert.equal(armarPayload(datos, true).password, 'Otra5678')
  })

  it('sin rol en el formulario (el admin editándose) no se manda rol', () => {
    const datos = { nombre: 'Ana', email: 'admin@distribuidora.com', password: '' }
    assert.equal('rol' in armarPayload(datos, true), false)
  })
})

describe('PATRON_PASSWORD', () => {
  const valida = (texto) => new RegExp(PATRON_PASSWORD).test(texto)

  // Sin la letra "d" a propósito: un patrón mal escapado (\d -> d) la exigiría.
  for (const buena of ['Logistica1', 'Venta123!', '12345678']) {
    it(`acepta "${buena}"`, () => {
      assert.equal(valida(buena), true)
    })
  }

  for (const mala of ['abc1', 'sinnumeros', 'deposito', '']) {
    it(`rechaza "${mala}"`, () => {
      assert.equal(valida(mala), false)
    })
  }

  it('tiene un mensaje que explica la regla', () => {
    assert.match(MENSAJE_PASSWORD, /8 caracteres/)
  })
})
