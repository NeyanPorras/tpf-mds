import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { crearTurnos } from './turnos.js'

/** Promesa que se resuelve cuando el test lo decide. */
function diferida() {
  let resolver
  const promesa = new Promise((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

describe('crearTurnos', () => {
  it('el último turno es el vigente', () => {
    const turnos = crearTurnos()
    const primero = turnos.siguiente()
    const segundo = turnos.siguiente()
    assert.equal(turnos.esVigente(primero), false)
    assert.equal(turnos.esVigente(segundo), true)
  })

  it('invalidar deja sin vigencia al turno en curso', () => {
    const turnos = crearTurnos()
    const turno = turnos.siguiente()
    turnos.invalidar()
    assert.equal(turnos.esVigente(turno), false)
  })

  it('una respuesta vieja que llega tarde no pisa a la nueva', async () => {
    const turnos = crearTurnos()
    const mostrado = []

    async function consultar(respuesta) {
      const turno = turnos.siguiente()
      const datos = await respuesta.promesa
      if (turnos.esVigente(turno)) mostrado.push(datos)
    }

    const lenta = diferida()
    const rapida = diferida()
    const primera = consultar(lenta)
    const segunda = consultar(rapida)

    rapida.resolver('septiembre')
    lenta.resolver('agosto a octubre')
    await Promise.all([primera, segunda])

    assert.deepEqual(mostrado, ['septiembre'])
  })

  it('cambiar un filtro descarta la consulta que estaba en vuelo', async () => {
    const turnos = crearTurnos()
    const respuesta = diferida()
    let mostrado = null

    const consulta = (async () => {
      const turno = turnos.siguiente()
      const datos = await respuesta.promesa
      if (turnos.esVigente(turno)) mostrado = datos
    })()

    turnos.invalidar() // el usuario cambió una fecha
    respuesta.resolver('datos viejos')
    await consulta

    assert.equal(mostrado, null)
  })
})
