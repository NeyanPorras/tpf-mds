import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fechaCorta, fechaLocalIso, fechaParaExcel, formatear, rangoDelMes } from './formato.js'

// Intl separa el "$" del número con un espacio duro (U+00A0).
const sinEspaciosDuros = (texto) => texto.replace(/ /g, ' ')

describe('formatear', () => {
  it('moneda en formato argentino', () => {
    assert.equal(sinEspaciosDuros(formatear(1530000, 'moneda')), '$ 1.530.000,00')
  })

  it('números con separador de miles', () => {
    assert.equal(formatear(12345, 'numero'), '12.345')
  })

  it('null o undefined se muestran como guion', () => {
    assert.equal(formatear(null, 'moneda'), '-')
    assert.equal(formatear(undefined, 'texto'), '-')
  })
})

// Contrato con el backend: las fechas llegan sin zona horaria
// ("2026-08-01T17:30:00"), en la hora de la distribuidora.
describe('fechas sin zona horaria', () => {
  it('fechaCorta muestra la hora tal como llega', () => {
    assert.equal(fechaCorta('2026-08-01T17:30:00'), '01/08/2026 17:30')
    assert.equal(fechaCorta('2026-08-01'), '01/08/2026')
  })

  it('fechaParaExcel conserva la hora en UTC (ExcelJS escribe en UTC)', () => {
    assert.equal(fechaParaExcel('2026-08-01T17:30:00').toISOString(), '2026-08-01T17:30:00.000Z')
  })

  it('una fecha con zona horaria es un error, no un corrimiento silencioso', () => {
    assert.throws(() => fechaCorta('2026-08-01T17:30:00Z'), /sin zona horaria/)
    assert.throws(() => fechaParaExcel('2026-08-01T17:30:00-03:00'), /sin zona horaria/)
  })
})

describe('fechas locales', () => {
  it('rangoDelMes va del día 1 a hoy', () => {
    assert.deepEqual(rangoDelMes(new Date(2026, 10, 9)), {
      desde: '2026-11-01',
      hasta: '2026-11-09',
    })
  })

  it('fechaLocalIso usa el día local, no el de UTC', () => {
    // 23:30 del 9/11 en hora local: en UTC ya puede ser el 10/11.
    assert.equal(fechaLocalIso(new Date(2026, 10, 9, 23, 30)), '2026-11-09')
  })
})
