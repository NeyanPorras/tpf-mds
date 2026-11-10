// Formato de valores para la tabla, el PDF y el Excel.
//
// Contrato con el backend: las fechas llegan sin zona horaria
// ("2026-08-01T17:30:00"), en la hora local de la distribuidora. Se leen
// como texto, sin pasar por Date, para que la hora no se corra. Si algún
// día llegan con "Z" u offset, estas funciones fallan en lugar de mostrar
// una hora equivocada (ver formato.test.js).

const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})
const NUMERO = new Intl.NumberFormat('es-AR')
const FECHA_SIN_ZONA = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/

function partesDeFecha(texto) {
  const partes = FECHA_SIN_ZONA.exec(String(texto))
  if (!partes) {
    throw new Error(`Se esperaba una fecha sin zona horaria (AAAA-MM-DDTHH:MM:SS): ${texto}`)
  }
  const [, anio, mes, dia, hh, mm, ss] = partes
  return { anio, mes, dia, hh, mm, ss: ss ?? '00' }
}

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

/** "2026-08-01T17:30:00" -> "01/08/2026 17:30"; "2026-08-01" -> "01/08/2026". */
export function fechaCorta(texto) {
  const { anio, mes, dia, hh, mm } = partesDeFecha(texto)
  return `${dia}/${mes}/${anio}${hh ? ` ${hh}:${mm}` : ''}`
}

/**
 * ExcelJS escribe las fechas en UTC: se arma la fecha en UTC con la hora tal
 * como llega del backend, así el Excel muestra la misma hora que la pantalla.
 */
export function fechaParaExcel(texto) {
  const { anio, mes, dia, hh = '00', mm = '00', ss } = partesDeFecha(texto)
  return new Date(Date.UTC(+anio, +mes - 1, +dia, +hh, +mm, +ss))
}

/** AAAA-MM-DD del día local (toISOString usaría el día de UTC). */
export function fechaLocalIso(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

/** Primer día del mes y hoy, como AAAA-MM-DD en hora local. */
export function rangoDelMes(hoy = new Date()) {
  const hasta = fechaLocalIso(hoy)
  return { desde: `${hasta.slice(0, 8)}01`, hasta }
}
