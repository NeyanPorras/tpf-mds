// Formato de valores para la tabla, el PDF y el Excel.

const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})
const NUMERO = new Intl.NumberFormat('es-AR')

/** Texto para mostrar un valor según el tipo de su columna. */
export function formatear(valor, tipo) {
  if (valor === null || valor === undefined) {
    return '-'
  }
  if (tipo === 'moneda') {
    return MONEDA.format(Number(valor))
  }
  if (tipo === 'numero') {
    return NUMERO.format(Number(valor))
  }
  if (tipo === 'fecha') {
    return fechaCorta(valor)
  }
  return String(valor)
}

/** "2026-08-01T10:30:00" -> "01/08/2026 10:30" (sin pasar por la zona horaria). */
export function fechaCorta(texto) {
  const [fecha, hora = ''] = String(texto).split('T')
  const [anio, mes, dia] = fecha.split('-')
  const hhmm = hora.slice(0, 5)
  return `${dia}/${mes}/${anio}${hhmm ? ` ${hhmm}` : ''}`
}

/** Hoy y el primer día del mes, como AAAA-MM-DD en hora local. */
export function rangoDelMes(hoy = new Date()) {
  const dos = (n) => String(n).padStart(2, '0')
  const anio = hoy.getFullYear()
  const mes = dos(hoy.getMonth() + 1)
  return { desde: `${anio}-${mes}-01`, hasta: `${anio}-${mes}-${dos(hoy.getDate())}` }
}
