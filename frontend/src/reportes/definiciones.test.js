import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { REPORTES, reportesDelRol } from './definiciones.js'

const ids = (reportes) => reportes.map((reporte) => reporte.id)

// Mismos permisos que backend/app/routers/reportes.py.
describe('reportesDelRol', () => {
  it('VENDEDOR ve los reportes de ventas', () => {
    assert.deepEqual(ids(reportesDelRol('VENDEDOR')), [
      'detalle-pedidos',
      'clientes-sobre-promedio',
      'ventas-por-zona-categoria',
      'ranking-productos',
    ])
  })

  it('DEPOSITO ve los reportes de stock', () => {
    assert.deepEqual(ids(reportesDelRol('DEPOSITO')), ['productos-sin-ventas', 'stock-bajo'])
  })

  it('ADMIN ve todos', () => {
    assert.equal(reportesDelRol('ADMIN').length, REPORTES.length)
  })

  it('sin rol no ve ninguno', () => {
    assert.deepEqual(reportesDelRol(undefined), [])
  })
})

describe('definiciones', () => {
  it('cada reporte tiene columnas con clave, título y tipo válido', () => {
    const tipos = new Set([undefined, 'texto', 'numero', 'moneda', 'fecha'])
    for (const reporte of REPORTES) {
      assert.ok(reporte.columnas.length > 0, reporte.id)
      for (const columna of reporte.columnas) {
        assert.ok(columna.clave && columna.titulo, `${reporte.id}: ${columna.clave}`)
        assert.ok(tipos.has(columna.tipo), `${reporte.id}: tipo ${columna.tipo}`)
      }
    }
  })
})
