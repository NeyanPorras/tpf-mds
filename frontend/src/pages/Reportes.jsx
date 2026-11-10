import { useRef, useState } from 'react'
import { http, mensajeDeError } from '../api/cliente.js'
import { useAuth } from '../auth/useAuth.js'
import Tabla from '../components/Tabla.jsx'
import { reportesDelRol } from '../reportes/definiciones.js'
import { exportarExcel, exportarPdf } from '../reportes/exportar.js'
import { armarConsulta, validar } from '../reportes/filtros.js'
import { formatear, rangoDelMes } from '../reportes/formato.js'
import { crearTurnos } from '../reportes/turnos.js'
import './Reportes.css'

// jsPDF y ExcelJS generan el archivo en el hilo principal: con muchas filas
// la pantalla se congela unos segundos, así que se avisa antes.
const FILAS_PARA_AVISAR = 2000

export default function Reportes() {
  const { usuario } = useAuth()
  const disponibles = reportesDelRol(usuario?.rol)

  const [idReporte, setIdReporte] = useState(disponibles[0]?.id ?? '')
  const [filtros, setFiltros] = useState({ ...rangoDelMes(), dias: '30', limite: '10' })
  const [fallas, setFallas] = useState({})
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState(null)
  const [error, setError] = useState(null)
  // Descarta respuestas de consultas que ya no corresponden a la pantalla.
  const turnos = useRef(crearTurnos()).current

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
    turnos.invalidar()
    setIdReporte(id)
    setResultado(null)
    setFallas({})
    setError(null)
  }

  function cambiarFiltro(nombre, valor) {
    setFiltros((previos) => ({ ...previos, [nombre]: valor }))
    // El resultado (y la consulta en curso, si hay) ya no corresponde a
    // los filtros en pantalla, y el error de ese campo ya se está corrigiendo.
    turnos.invalidar()
    setResultado(null)
    setCargando(false)
    setFallas(({ [nombre]: _corregido, ...resto }) => resto)
  }

  async function consultar(evento) {
    evento.preventDefault()
    const nuevasFallas = validar(reporte, filtros)
    setFallas(nuevasFallas)
    if (Object.keys(nuevasFallas).length > 0) return

    const { params, texto } = armarConsulta(reporte, filtros)
    const turno = turnos.siguiente()
    setCargando(true)
    setError(null)
    try {
      const { data } = await http.get(`/reportes/${reporte.id}`, { params })
      if (!turnos.esVigente(turno)) return
      setResultado({ reporte, filas: data, texto })
    } catch (err) {
      if (!turnos.esVigente(turno)) return
      setResultado(null)
      setError(mensajeDeError(err))
    } finally {
      if (turnos.esVigente(turno)) setCargando(false)
    }
  }

  async function exportar(formato) {
    const cantidad = resultado.filas.length
    if (
      cantidad > FILAS_PARA_AVISAR &&
      !window.confirm(`El reporte tiene ${cantidad} filas y puede tardar unos segundos. ¿Exportar igual?`)
    ) {
      return
    }
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
              <small className="reportes-aplicados">{resultado.texto}</small>
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
