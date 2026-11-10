import { useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import { getUsuario } from '../api/sesion.js'
import Tabla from '../components/Tabla.jsx'
import { reportesDelRol } from '../reportes/definiciones.js'
import { exportarExcel, exportarPdf } from '../reportes/exportar.js'
import { fechaCorta, formatear, rangoDelMes } from '../reportes/formato.js'
import './Reportes.css'

/** Valida los filtros antes de llamar a la API (la API valida lo mismo). */
function validar(reporte, filtros) {
  const fallas = {}
  if (reporte.filtros.includes('fechas')) {
    if (!filtros.desde) fallas.desde = 'Elegí la fecha desde.'
    if (!filtros.hasta) fallas.hasta = 'Elegí la fecha hasta.'
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      fallas.desde = "La fecha 'desde' no puede ser posterior a 'hasta'."
    }
  }
  if (reporte.filtros.includes('dias')) {
    const dias = Number(filtros.dias)
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      fallas.dias = 'Los días van de 1 a 365.'
    }
  }
  if (reporte.filtros.includes('limite')) {
    const limite = Number(filtros.limite)
    if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
      fallas.limite = 'El límite va de 1 a 50.'
    }
  }
  return fallas
}

/** Parámetros de la API y texto de los filtros para el PDF y el Excel. */
function armarConsulta(reporte, filtros) {
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

export default function Reportes() {
  const usuario = getUsuario()
  const disponibles = reportesDelRol(usuario?.rol)

  const [idReporte, setIdReporte] = useState(disponibles[0]?.id ?? '')
  const [filtros, setFiltros] = useState({ ...rangoDelMes(), dias: '30', limite: '10' })
  const [fallas, setFallas] = useState({})
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState(null)
  const [error, setError] = useState(null)

  const reporte = disponibles.find((item) => item.id === idReporte)

  if (!reporte) {
    return (
      <section>
        <h2>Reportes</h2>
        <p>Tu rol no tiene reportes disponibles.</p>
      </section>
    )
  }

  function cambiarReporte(id) {
    setIdReporte(id)
    setResultado(null)
    setFallas({})
    setError(null)
  }

  function cambiarFiltro(nombre, valor) {
    setFiltros((previos) => ({ ...previos, [nombre]: valor }))
  }

  async function consultar(evento) {
    evento.preventDefault()
    const nuevasFallas = validar(reporte, filtros)
    setFallas(nuevasFallas)
    if (Object.keys(nuevasFallas).length > 0) return

    const { params, texto } = armarConsulta(reporte, filtros)
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get(`/reportes/${reporte.id}`, { params })
      setResultado({ reporte, filas: data, texto })
    } catch (err) {
      setResultado(null)
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }

  async function exportar(formato) {
    setExportando(formato)
    setError(null)
    try {
      const exportador = formato === 'pdf' ? exportarPdf : exportarExcel
      await exportador(resultado.reporte, resultado.filas, resultado.texto)
    } catch {
      setError(`No se pudo generar el ${formato === 'pdf' ? 'PDF' : 'Excel'}.`)
    } finally {
      setExportando(null)
    }
  }

  const columnas = reporte.columnas.map((columna) => ({
    clave: columna.clave,
    titulo: columna.titulo,
    render: (fila) => formatear(fila[columna.clave], columna.tipo),
  }))
  const hayFilas = resultado?.reporte.id === reporte.id && resultado.filas.length > 0

  return (
    <section>
      <header className="reportes-cabecera">
        <h2>Reportes</h2>
        <p>Elegí un reporte, ajustá los filtros y exportalo a PDF o Excel.</p>
      </header>

      <form className="reportes-filtros" onSubmit={consultar} noValidate>
        <label>
          Reporte
          <select value={reporte.id} onChange={(e) => cambiarReporte(e.target.value)}>
            {disponibles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titulo}
              </option>
            ))}
          </select>
        </label>

        {reporte.filtros.includes('fechas') && (
          <>
            <label>
              Desde
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => cambiarFiltro('desde', e.target.value)}
              />
              {fallas.desde && <span className="reportes-falla">{fallas.desde}</span>}
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => cambiarFiltro('hasta', e.target.value)}
              />
              {fallas.hasta && <span className="reportes-falla">{fallas.hasta}</span>}
            </label>
          </>
        )}

        {reporte.filtros.includes('dias') && (
          <label>
            Días sin ventas
            <input
              type="number"
              min="1"
              max="365"
              value={filtros.dias}
              onChange={(e) => cambiarFiltro('dias', e.target.value)}
            />
            {fallas.dias && <span className="reportes-falla">{fallas.dias}</span>}
          </label>
        )}

        {reporte.filtros.includes('limite') && (
          <label>
            Cantidad
            <input
              type="number"
              min="1"
              max="50"
              value={filtros.limite}
              onChange={(e) => cambiarFiltro('limite', e.target.value)}
            />
            {fallas.limite && <span className="reportes-falla">{fallas.limite}</span>}
          </label>
        )}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>

      <p className="reportes-descripcion">{reporte.descripcion}</p>
      {error && <p className="aviso-error">{error}</p>}

      {resultado?.reporte.id === reporte.id && (
        <>
          <div className="reportes-acciones">
            <span>
              {resultado.filas.length} {resultado.filas.length === 1 ? 'fila' : 'filas'}
            </span>
            <button
              type="button"
              className="btn-secundario"
              disabled={!hayFilas || exportando !== null}
              onClick={() => exportar('pdf')}
            >
              {exportando === 'pdf' ? 'Generando…' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              className="btn-secundario"
              disabled={!hayFilas || exportando !== null}
              onClick={() => exportar('excel')}
            >
              {exportando === 'excel' ? 'Generando…' : 'Exportar Excel'}
            </button>
          </div>

          <Tabla
            columnas={columnas}
            filas={resultado.filas}
            claveFila={(_, indice) => indice}
            mensajeVacio="No hay datos para estos filtros."
          />
        </>
      )}
    </section>
  )
}
