// Exportación de un reporte a PDF (jsPDF + autoTable) y a Excel (ExcelJS).
// Las librerías se cargan recién al exportar, así no pesan en el resto de la app.
import { formatear } from './formato.js'

function nombreArchivo(reporte, extension) {
  const hoy = new Date().toISOString().slice(0, 10)
  return `${reporte.id}_${hoy}.${extension}`
}

// ExcelJS escribe las fechas en UTC: se arma la fecha en UTC con la hora tal
// como viene de la base, así el Excel muestra la misma hora que la pantalla.
function fechaParaExcel(texto) {
  const [fecha, hora = '00:00:00'] = String(texto).split('T')
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [hh, mm, ss] = hora.split(':').map((parte) => Number.parseInt(parte, 10) || 0)
  return new Date(Date.UTC(anio, mes - 1, dia, hh, mm, ss))
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

/**
 * @param {object} reporte  Definición de reportes/definiciones.js
 * @param {object[]} filas  Filas que devolvió la API
 * @param {string} filtros  Texto con los filtros usados, para el encabezado
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
      reporte.columnas.map((columna) => {
        const valor = fila[columna.clave]
        if (columna.tipo === 'moneda' || columna.tipo === 'numero') return Number(valor)
        if (columna.tipo === 'fecha') return fechaParaExcel(valor)
        return valor
      }),
    )
  }

  reporte.columnas.forEach((columna, indice) => {
    const columnaExcel = hoja.getColumn(indice + 1)
    columnaExcel.width = Math.max(12, columna.titulo.length + 4)
    if (columna.tipo === 'moneda') columnaExcel.numFmt = '"$" #,##0.00'
    if (columna.tipo === 'fecha') columnaExcel.numFmt = 'dd/mm/yyyy hh:mm'
  })
  hoja.getColumn(1).width = Math.max(hoja.getColumn(1).width, 14)

  const datos = await libro.xlsx.writeBuffer()
  const blob = new Blob([datos], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  descargar(blob, nombreArchivo(reporte, 'xlsx'))
}
