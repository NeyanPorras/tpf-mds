// Validación de los filtros y armado de la consulta a la API.
// La API valida lo mismo: esto evita el viaje cuando el dato ya está mal.
import { fechaCorta } from './formato.js'

const esEnteroEntre = (texto, minimo, maximo) => {
  const numero = Number(texto)
  return texto !== '' && Number.isInteger(numero) && numero >= minimo && numero <= maximo
}

/** Devuelve { campo: mensaje } con los filtros inválidos (vacío si todo está bien). */
export function validar(reporte, filtros) {
  const fallas = {}
  if (reporte.filtros.includes('fechas')) {
    if (!filtros.desde) fallas.desde = 'Elegí la fecha desde.'
    if (!filtros.hasta) fallas.hasta = 'Elegí la fecha hasta.'
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      fallas.desde = "La fecha 'desde' no puede ser posterior a 'hasta'."
    }
  }
  if (reporte.filtros.includes('dias') && !esEnteroEntre(filtros.dias, 1, 365)) {
    fallas.dias = 'Los días van de 1 a 365.'
  }
  if (reporte.filtros.includes('limite') && !esEnteroEntre(filtros.limite, 1, 50)) {
    fallas.limite = 'El límite va de 1 a 50.'
  }
  return fallas
}

/** Parámetros para la API y texto de los filtros aplicados (pantalla, PDF y Excel). */
export function armarConsulta(reporte, filtros) {
  const params = {}
  const partes = []
  if (reporte.filtros.includes('fechas')) {
    params.desde = filtros.desde
    params.hasta = filtros.hasta
    partes.push(`Desde ${fechaCorta(filtros.desde)} hasta ${fechaCorta(filtros.hasta)}`)
  }
  if (reporte.filtros.includes('dias')) {
    params.dias = Number(filtros.dias)
    partes.push(`Sin ventas en los últimos ${filtros.dias} días`)
  }
  if (reporte.filtros.includes('limite')) {
    params.limite = Number(filtros.limite)
    partes.push(`Primeros ${filtros.limite}`)
  }
  partes.push(`Generado el ${new Date().toLocaleString('es-AR')}`)
  return { params, texto: partes.join(' · ') }
}
