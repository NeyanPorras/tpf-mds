// Exportación de un reporte a PDF (jsPDF + autoTable) y a Excel (ExcelJS).
// Las librerías se cargan recién al exportar, así no pesan en el resto de la app.
import { fechaLocalIso, fechaParaExcel, formatear } from './formato.js'

const ANCHO_MINIMO = 10
const ANCHO_MAXIMO = 50

function nombreArchivo(reporte, extension) {
  return `${reporte.id}_${fechaLocalIso()}.${extension}`
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Firefox y Safari pueden cancelar la descarga si la URL se libera en el
  // mismo ciclo del click: se libera en el siguiente.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Valor real para la celda de Excel: números y fechas, no texto formateado. */
function valorParaExcel(valor, tipo) {
  if (valor === null || valor === undefined) return null
  if (tipo === 'moneda' || tipo === 'numero') return Number(valor)
  if (tipo === 'fecha') return fechaParaExcel(valor)
  return valor
}

/**
 * @param {object} reporte  Definición de reportes/definiciones.js
 * @param {object[]} filas  Filas que devolvió la API
 * @param {string} filtros  Texto con los filtros aplicados, para el encabezado
 */
export async function exportarPdf(reporte, filas, filtros) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const horizontal = reporte.columnas.length > 5
  const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait' })

  doc.setFontSize(14)
  doc.text(`Distribuidora de bebidas - ${reporte.titulo}`, 14, 16)
  doc.setFontSize(9)
  doc.text(filtros, 14, 22)

  autoTable(doc, {
    startY: 27,
    head: [reporte.columnas.map((columna) => columna.titulo)],
    body: filas.map((fila) =>
      reporte.columnas.map((columna) => formatear(fila[columna.clave], columna.tipo)),
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: Object.fromEntries(
      reporte.columnas
        .map((columna, indice) => [indice, columna])
        .filter(([, columna]) => columna.tipo === 'moneda' || columna.tipo === 'numero')
        .map(([indice]) => [indice, { halign: 'right' }]),
    ),
  })

  doc.save(nombreArchivo(reporte, 'pdf'))
}

export async function exportarExcel(reporte, filas, filtros) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet(reporte.titulo.slice(0, 31))

  hoja.addRow([`Distribuidora de bebidas - ${reporte.titulo}`]).font = { bold: true, size: 13 }
  hoja.addRow([filtros])
  hoja.addRow([])

  const encabezado = hoja.addRow(reporte.columnas.map((columna) => columna.titulo))
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
  })

  // En el Excel van los valores reales (números y fechas), no el texto
  // formateado, para que se puedan sumar y ordenar.
  for (const fila of filas) {
    hoja.addRow(
      reporte.columnas.map((columna) => valorParaExcel(fila[columna.clave], columna.tipo)),
    )
  }

  // Cada columna toma el ancho de su texto más largo (título o contenido).
  reporte.columnas.forEach((columna, indice) => {
    const largoMaximo = filas.reduce(
      (maximo, fila) => Math.max(maximo, formatear(fila[columna.clave], columna.tipo).length),
      columna.titulo.length,
    )
    const columnaExcel = hoja.getColumn(indice + 1)
    columnaExcel.width = Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, largoMaximo + 2))
    if (columna.tipo === 'moneda') columnaExcel.numFmt = '"$" #,##0.00'
    if (columna.tipo === 'fecha') columnaExcel.numFmt = 'dd/mm/yyyy hh:mm'
  })

  const datos = await libro.xlsx.writeBuffer()
  const blob = new Blob([datos], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  descargar(blob, nombreArchivo(reporte, 'xlsx'))
}
