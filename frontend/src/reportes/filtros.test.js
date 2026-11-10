import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { REPORTES } from './definiciones.js'
import { armarConsulta, validar } from './filtros.js'

const porId = (id) => REPORTES.find((reporte) => reporte.id === id)
const BASE = { desde: '2026-08-01', hasta: '2026-10-31', dias: '30', limite: '10' }

describe('validar', () => {
  it('acepta un rango de fechas correcto', () => {
    assert.deepEqual(validar(porId('detalle-pedidos'), BASE), {})
  })

  it('acepta desde igual a hasta', () => {
    const filtros = { ...BASE, desde: '2026-08-01', hasta: '2026-08-01' }
    assert.deepEqual(validar(porId('detalle-pedidos'), filtros), {})
  })

  it('rechaza desde posterior a hasta', () => {
    const filtros = { ...BASE, desde: '2026-10-31', hasta: '2026-08-01' }
    assert.equal(
      validar(porId('detalle-pedidos'), filtros).desde,
      "La fecha 'desde' no puede ser posterior a 'hasta'.",
    )
  })

  it('pide las dos fechas', () => {
    const fallas = validar(porId('detalle-pedidos'), { ...BASE, desde: '', hasta: '' })
    assert.deepEqual(Object.keys(fallas).sort(), ['desde', 'hasta'])
  })

  for (const dias of ['0', '366', '2.5', 'abc', '']) {
    it(`rechaza dias = "${dias}"`, () => {
      const fallas = validar(porId('productos-sin-ventas'), { ...BASE, dias })
      assert.equal(fallas.dias, 'Los días van de 1 a 365.')
    })
  }

  for (const dias of ['1', '365']) {
    it(`acepta dias = ${dias}`, () => {
      assert.deepEqual(validar(porId('productos-sin-ventas'), { ...BASE, dias }), {})
    })
  }

  for (const limite of ['0', '51', '1.5']) {
    it(`rechaza limite = "${limite}"`, () => {
      const fallas = validar(porId('ranking-productos'), { ...BASE, limite })
      assert.equal(fallas.limite, 'El límite va de 1 a 50.')
    })
  }

  it('no valida filtros que el reporte no usa', () => {
    const filtros = { desde: '', hasta: '', dias: '0', limite: '0' }
    assert.deepEqual(validar(porId('stock-bajo'), filtros), {})
  })
})

describe('armarConsulta', () => {
  it('manda solo los parámetros del reporte', () => {
    assert.deepEqual(armarConsulta(porId('ranking-productos'), BASE).params, {
      desde: '2026-08-01',
      hasta: '2026-10-31',
      limite: 10,
    })
    assert.deepEqual(armarConsulta(porId('productos-sin-ventas'), BASE).params, { dias: 30 })
    assert.deepEqual(armarConsulta(porId('stock-bajo'), BASE).params, {})
  })

  it('describe los filtros aplicados', () => {
    const { texto } = armarConsulta(porId('ranking-productos'), BASE)
    assert.match(texto, /^Desde 01\/08\/2026 hasta 31\/10\/2026 · Primeros 10 · Generado el /)
  })
})
