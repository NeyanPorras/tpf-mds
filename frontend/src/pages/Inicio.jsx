import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { http, mensajeDeError } from '../api/cliente.js'
import { crearTurnos } from '../reportes/turnos.js'
import { fechaCorta, fechaLocalIso, formatear } from '../reportes/formato.js'
import './Inicio.css'

function rangoEsteMes() {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth() + 1
  const ultimo = new Date(y, m, 0).getDate()
  const dos = (n) => String(n).padStart(2, '0')
  return {
    desde: `${y}-${dos(m)}-01`,
    hasta: `${y}-${dos(m)}-${dos(ultimo)}`,
  }
}

function rangoUltimos30Dias() {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  return {
    desde: fechaLocalIso(hace30),
    hasta: fechaLocalIso(hoy),
  }
}

function rangoSemillaPrueba() {
  return {
    desde: '2026-08-01',
    hasta: '2026-10-31',
  }
}

/**
 * Completa los días del rango con total 0 para los días sin ventas.
 * Así el gráfico muestra la evolución real en el tiempo con sus huecos.
 */
function completarDias(ventasPorDia, desde, hasta) {
  if (!desde || !hasta || desde > hasta) return ventasPorDia || []

  const mapa = new Map()
  for (const item of ventasPorDia || []) {
    const clave = String(item.fecha).slice(0, 10)
    mapa.set(clave, Number(item.total) || 0)
  }

  const [a1, m1, d1] = desde.split('-').map(Number)
  const [a2, m2, d2] = hasta.split('-').map(Number)
  const actual = new Date(a1, m1 - 1, d1)
  const fin = new Date(a2, m2 - 1, d2)

  const diffDias = Math.round((fin - actual) / (1000 * 60 * 60 * 24))
  if (diffDias < 0 || diffDias > 366) return ventasPorDia || []

  const resultado = []
  while (actual <= fin) {
    const y = actual.getFullYear()
    const m = String(actual.getMonth() + 1).padStart(2, '0')
    const d = String(actual.getDate()).padStart(2, '0')
    const fechaIso = `${y}-${m}-${d}`
    resultado.push({
      fecha: fechaIso,
      total: mapa.get(fechaIso) || 0,
    })
    actual.setDate(actual.getDate() + 1)
  }
  return resultado
}

export default function Inicio() {
  const defaultRango = rangoEsteMes()
  const [desde, setDesde] = useState(defaultRango.desde)
  const [hasta, setHasta] = useState(defaultRango.hasta)
  const [presetActivo, setPresetActivo] = useState('mes')

  const [dashboard, setDashboard] = useState({
    ventas_mes: 0,
    pedidos_pendientes: 0,
    productos_bajo_minimo: 0,
    clientes_activos: 0,
    ventas_por_dia: [],
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const chartId = useId()

  // Evita carreras entre consultas con turnos (mismo patrón que Reportes)
  const turnos = useRef(crearTurnos()).current

  const cargarDashboard = useCallback(
    async (fDesde, fHasta) => {
      // 1. Si falta alguna fecha no se consulta al backend
      if (!fDesde || !fHasta) {
        turnos.invalidar()
        setCargando(false)
        setError('Completá las dos fechas.')
        return
      }

      // 2. Validación de fechas invertidas
      if (fDesde > fHasta) {
        turnos.invalidar()
        setCargando(false)
        setError("La fecha 'desde' no puede ser posterior a 'hasta'.")
        return
      }

      const turno = turnos.siguiente()
      setCargando(true)
      setError(null)
      setDiaSeleccionado(null)

      try {
        const { data } = await http.get('/dashboard', {
          params: { desde: fDesde, hasta: fHasta },
        })
        if (!turnos.esVigente(turno)) return
        setDashboard(data)
      } catch (err) {
        if (!turnos.esVigente(turno)) return
        setError(mensajeDeError(err))
      } finally {
        if (turnos.esVigente(turno)) {
          setCargando(false)
        }
      }
    },
    [turnos],
  )

  useEffect(() => {
    cargarDashboard(defaultRango.desde, defaultRango.hasta)
  }, [cargarDashboard, defaultRango.desde, defaultRango.hasta])

  function aplicarPreset(nombre, calcularRango) {
    const rango = calcularRango()
    turnos.invalidar()
    setPresetActivo(nombre)
    setDesde(rango.desde)
    setHasta(rango.hasta)
    cargarDashboard(rango.desde, rango.hasta)
  }

  function manejarCambioDesde(valor) {
    turnos.invalidar()
    setPresetActivo(null)
    setDesde(valor)
    if (!valor || !hasta) {
      setError('Completá las dos fechas.')
    } else if (valor > hasta) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.")
    } else {
      setError(null)
    }
  }

  function manejarCambioHasta(valor) {
    turnos.invalidar()
    setPresetActivo(null)
    setHasta(valor)
    if (!desde || !valor) {
      setError('Completá las dos fechas.')
    } else if (desde > valor) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.")
    } else {
      setError(null)
    }
  }

  function manejarFiltrar(e) {
    e.preventDefault()
    cargarDashboard(desde, hasta)
  }

  // Completa todos los días del período (con 0 si no hubo ventas)
  const diasCompletos = useMemo(() => {
    return completarDias(dashboard.ventas_por_dia, desde, hasta)
  }, [dashboard.ventas_por_dia, desde, hasta])

  const diasConVenta = diasCompletos.filter((d) => d.total > 0).length
  const maxVenta = Math.max(...diasCompletos.map((d) => d.total), 1)

  // Dimensiones del gráfico SVG
  const svgAncho = 800
  const svgAlto = 260
  const margen = { arriba: 25, derecha: 25, abajo: 45, izquierda: 85 }
  const plotAncho = svgAncho - margen.izquierda - margen.derecha
  const plotAlto = svgAlto - margen.arriba - margen.abajo

  // Niveles del eje Y (4 divisiones)
  const nivelesY = [0, 0.33, 0.66, 1].map((pct) => ({
    valor: maxVenta * pct,
    y: margen.arriba + plotAlto - plotAlto * pct,
  }))

  const cantidadDias = diasCompletos.length
  const anchoColumna = cantidadDias > 0 ? plotAncho / cantidadDias : 0
  const anchoBarra = Math.min(Math.max(anchoColumna * 0.75, 2), 32)

  // Salteo dinámico de etiquetas en X según la cantidad de días del rango
  const saltoEtiquetas =
    cantidadDias > 45 ? Math.ceil(cantidadDias / 8) : cantidadDias > 15 ? 3 : 1

  return (
    <div className="dashboard">
      <header className="dashboard-cabecera">
        <div className="dashboard-titulo">
          <h2>Dashboard</h2>
          <p>Métricas clave del negocio y evolución de ventas</p>
        </div>

        <div className="dashboard-filtros">
          <form className="filtros-rango" onSubmit={manejarFiltrar}>
            <label className="filtro-campo">
              <span>Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => manejarCambioDesde(e.target.value)}
              />
            </label>
            <label className="filtro-campo">
              <span>Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => manejarCambioHasta(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="boton-actualizar"
              disabled={cargando}
            >
              {cargando ? 'Cargando…' : 'Actualizar'}
            </button>
          </form>

          <div className="filtros-presets">
            <button
              type="button"
              className={`boton-preset ${presetActivo === 'mes' ? 'activo' : ''}`}
              onClick={() => aplicarPreset('mes', rangoEsteMes)}
            >
              Este mes
            </button>
            <button
              type="button"
              className={`boton-preset ${presetActivo === '30d' ? 'activo' : ''}`}
              onClick={() => aplicarPreset('30d', rangoUltimos30Dias)}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              className={`boton-preset ${presetActivo === 'prueba' ? 'activo' : ''}`}
              onClick={() => aplicarPreset('prueba', rangoSemillaPrueba)}
            >
              Ago - Oct 2026 (Prueba)
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="aviso-error" role="alert">
          {error}
        </div>
      )}

      {/* Grid de 4 tarjetas de indicadores */}
      <section
        className={`metricas-grid ${cargando ? 'dashboard-cargando' : ''}`}
      >
        <article className="tarjeta-metrica">
          <div className="tarjeta-arriba">
            <span className="tarjeta-etiqueta">Ventas del período</span>
            <span className="tarjeta-icono icono-azul" aria-hidden="true">
              $
            </span>
          </div>
          <div className="tarjeta-valor">
            {formatear(dashboard.ventas_mes, 'moneda')}
          </div>
          <p className="tarjeta-subtexto">Pedidos confirmados o entregados</p>
        </article>

        <article className="tarjeta-metrica">
          <div className="tarjeta-arriba">
            <span className="tarjeta-etiqueta">Clientes activos</span>
            <span className="tarjeta-icono icono-verde" aria-hidden="true">
              👥
            </span>
          </div>
          <div className="tarjeta-valor">{dashboard.clientes_activos}</div>
          <p className="tarjeta-subtexto">
            Compraron en el período seleccionado
          </p>
        </article>

        <article className="tarjeta-metrica">
          <div className="tarjeta-arriba">
            <span className="tarjeta-etiqueta">Pedidos pendientes</span>
            <span
              className={`tarjeta-icono ${
                dashboard.pedidos_pendientes > 0
                  ? 'icono-amarillo'
                  : 'icono-verde'
              }`}
              aria-hidden="true"
            >
              ⏳
            </span>
          </div>
          <div className="tarjeta-valor">{dashboard.pedidos_pendientes}</div>
          <p className="tarjeta-subtexto">Aún no confirmados</p>
          <Link to="/pedidos" className="tarjeta-enlace">
            Ver pedidos →
          </Link>
        </article>

        <article className="tarjeta-metrica">
          <div className="tarjeta-arriba">
            <span className="tarjeta-etiqueta">Stock bajo</span>
            <span
              className={`tarjeta-icono ${
                dashboard.productos_bajo_minimo > 0
                  ? 'icono-rojo'
                  : 'icono-verde'
              }`}
              aria-hidden="true"
            >
              ⚠️
            </span>
          </div>
          <div className="tarjeta-valor">
            {dashboard.productos_bajo_minimo}
          </div>
          <p className="tarjeta-subtexto">
            Productos en o por debajo del mínimo
          </p>
          <Link to="/productos" className="tarjeta-enlace">
            Ver productos →
          </Link>
        </article>
      </section>

      {/* Gráfico de evolución de ventas por día */}
      <section
        className={`grafico-seccion ${cargando ? 'dashboard-cargando' : ''}`}
      >
        <div className="grafico-cabecera">
          <h3>Evolución de ventas por día</h3>
          <div className="grafico-resumen">
            Días con ventas: <strong>{diasConVenta}</strong> de{' '}
            <strong>{cantidadDias}</strong> · Rango:{' '}
            <strong>
              {desde ? fechaCorta(desde) : '—'} —{' '}
              {hasta ? fechaCorta(hasta) : '—'}
            </strong>
          </div>
        </div>

        {diasConVenta === 0 ? (
          <div className="grafico-vacio">
            <div className="grafico-vacio-icono" aria-hidden="true">
              📊
            </div>
            <p>
              No se registraron ventas confirmadas en las fechas seleccionadas.
            </p>
            <small>
              Probá ampliar el rango o seleccioná &quot;Ago - Oct 2026
              (Prueba)&quot; para ver los datos de prueba.
            </small>
          </div>
        ) : (
          <>
            <div className="grafico-svg-contenedor">
              <svg
                className="grafico-svg"
                viewBox={`0 0 ${svgAncho} ${svgAlto}`}
                role="img"
                aria-label="Gráfico de barras de ventas diarias"
              >
                {/* Líneas guía horizontales y valores del eje Y */}
                {nivelesY.map((nivel, idx) => (
                  <g key={`${chartId}-y-${idx}`}>
                    <line
                      x1={margen.izquierda}
                      y1={nivel.y}
                      x2={svgAncho - margen.derecha}
                      y2={nivel.y}
                      className="grafico-linea-guia"
                    />
                    <text
                      x={margen.izquierda - 8}
                      y={nivel.y + 4}
                      textAnchor="end"
                      className="grafico-texto-eje"
                    >
                      {formatear(nivel.valor, 'moneda').replace(',00', '')}
                    </text>
                  </g>
                ))}

                {/* Barras y etiquetas del eje X */}
                {diasCompletos.map((dia, index) => {
                  const tieneVenta = dia.total > 0
                  const altura = tieneVenta
                    ? Math.max((dia.total / maxVenta) * plotAlto, 3)
                    : 2
                  const xCentro =
                    margen.izquierda + index * anchoColumna + anchoColumna / 2
                  const x = xCentro - anchoBarra / 2
                  const y = margen.arriba + plotAlto - altura
                  const seleccionado =
                    diaSeleccionado && diaSeleccionado.fecha === dia.fecha

                  return (
                    <g key={dia.fecha}>
                      <rect
                        x={x}
                        y={y}
                        width={anchoBarra}
                        height={altura}
                        className={`grafico-barra ${tieneVenta ? '' : 'grafico-barra-cero'} ${seleccionado ? 'seleccionada' : ''}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`${fechaCorta(dia.fecha)}: ${formatear(dia.total, 'moneda')}`}
                        onClick={() => setDiaSeleccionado(dia)}
                        onMouseEnter={() => setDiaSeleccionado(dia)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setDiaSeleccionado(dia)
                          }
                        }}
                      >
                        <title>{`${fechaCorta(dia.fecha)}: ${formatear(dia.total, 'moneda')}`}</title>
                      </rect>

                      {index % saltoEtiquetas === 0 && (
                        <text
                          x={xCentro}
                          y={svgAlto - margen.abajo + 18}
                          textAnchor="middle"
                          className="grafico-texto-eje"
                        >
                          {dia.fecha.slice(8, 10)}/{dia.fecha.slice(5, 7)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {diaSeleccionado && (
              <div className="grafico-info-detalle">
                <span>
                  Fecha seleccionada:{' '}
                  <strong>{fechaCorta(diaSeleccionado.fecha)}</strong>
                </span>
                <span>
                  Total vendido:{' '}
                  <strong>{formatear(diaSeleccionado.total, 'moneda')}</strong>
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
