import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { http, mensajeDeError } from '../api/cliente.js'
import './Inicio.css'

function formatoFechaISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function rangoEsteMes() {
  const hoy = new Date()
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  return {
    desde: formatoFechaISO(primerDia),
    hasta: formatoFechaISO(ultimoDia),
  }
}

function rangoUltimos30Dias() {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  return {
    desde: formatoFechaISO(hace30),
    hasta: formatoFechaISO(hoy),
  }
}

function rangoSemillaPrueba() {
  return {
    desde: '2026-08-01',
    hasta: '2026-10-31',
  }
}

function formatearMoneda(valor) {
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero)
}

function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const partes = fechaStr.slice(0, 10).split('-')
  if (partes.length !== 3) return fechaStr
  return `${partes[2]}/${partes[1]}`
}

function formatearFechaLarga(fechaStr) {
  if (!fechaStr) return ''
  const partes = fechaStr.slice(0, 10).split('-')
  if (partes.length !== 3) return fechaStr
  return `${partes[2]}/${partes[1]}/${partes[0]}`
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

  const cargarDashboard = useCallback(async (fDesde, fHasta) => {
    setCargando(true)
    setError(null)
    setDiaSeleccionado(null)

    if (fDesde && fHasta && fDesde > fHasta) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.")
      setCargando(false)
      return
    }

    try {
      const params = {}
      if (fDesde) params.desde = fDesde
      if (fHasta) params.hasta = fHasta

      const { data } = await http.get('/dashboard', { params })
      setDashboard(data)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDashboard(desde, hasta)
  }, [cargarDashboard, desde, hasta])

  function aplicarPreset(nombre, calcularRango) {
    const rango = calcularRango()
    setPresetActivo(nombre)
    setDesde(rango.desde)
    setHasta(rango.hasta)
  }

  function manejarFiltrar(e) {
    e.preventDefault()
    setPresetActivo(null)
    cargarDashboard(desde, hasta)
  }

  // Dimensiones del gráfico SVG
  const svgAncho = 800
  const svgAlto = 260
  const margen = { arriba: 25, derecha: 25, abajo: 45, izquierda: 80 }
  const plotAncho = svgAncho - margen.izquierda - margen.derecha
  const plotAlto = svgAlto - margen.arriba - margen.abajo

  const ventasPorDia = dashboard.ventas_por_dia || []
  const maxVenta = Math.max(...ventasPorDia.map((d) => d.total), 1)

  // Niveles del eje Y (4 divisiones)
  const nivelesY = [0, 0.33, 0.66, 1].map((pct) => ({
    valor: maxVenta * pct,
    y: margen.arriba + plotAlto - plotAlto * pct,
  }))

  const cantidadDias = ventasPorDia.length
  const anchoBarraDisponible = cantidadDias > 0 ? plotAncho / cantidadDias : 0
  const anchoBarra = Math.min(Math.max(anchoBarraDisponible * 0.7, 6), 36)

  // Salteo de etiquetas si hay muchas fechas
  const saltoEtiquetas = cantidadDias > 15 ? Math.ceil(cantidadDias / 10) : 1

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
                onChange={(e) => {
                  setDesde(e.target.value)
                  setPresetActivo(null)
                }}
              />
            </label>
            <label className="filtro-campo">
              <span>Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value)
                  setPresetActivo(null)
                }}
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
            {formatearMoneda(dashboard.ventas_mes)}
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
          <p className="tarjeta-subtexto">Estado actual pendiente de entrega</p>
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

      {/* Gráfico de ventas por día */}
      <section
        className={`grafico-seccion ${cargando ? 'dashboard-cargando' : ''}`}
      >
        <div className="grafico-cabecera">
          <h3>Evolución de ventas por día</h3>
          <div className="grafico-resumen">
            Días con ventas: <strong>{ventasPorDia.length}</strong> · Rango:{' '}
            <strong>
              {formatearFechaLarga(desde)} — {formatearFechaLarga(hasta)}
            </strong>
          </div>
        </div>

        {ventasPorDia.length === 0 ? (
          <div className="grafico-vacio">
            <div className="grafico-vacio-icono" aria-hidden="true">
              📊
            </div>
            <p>
              No se registraron ventas confirmadas en las fechas seleccionadas.
            </p>
            <small>
              Probá ampliar el rango o seleccioná el botón &quot;Ago - Oct
              2026&quot; para ver los datos de prueba.
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
                      {formatearMoneda(nivel.valor).replace(',00', '')}
                    </text>
                  </g>
                ))}

                {/* Barras y etiquetas del eje X */}
                {ventasPorDia.map((dia, index) => {
                  const altura = Math.max(
                    (dia.total / maxVenta) * plotAlto,
                    3,
                  )
                  const xCentro =
                    margen.izquierda +
                    index * anchoBarraDisponible +
                    anchoBarraDisponible / 2
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
                        className={`grafico-barra ${seleccionado ? 'seleccionada' : ''}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`${formatearFechaLarga(dia.fecha)}: ${formatearMoneda(dia.total)}`}
                        onClick={() => setDiaSeleccionado(dia)}
                        onMouseEnter={() => setDiaSeleccionado(dia)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setDiaSeleccionado(dia)
                          }
                        }}
                      >
                        <title>{`${formatearFechaLarga(dia.fecha)}: ${formatearMoneda(dia.total)}`}</title>
                      </rect>

                      {index % saltoEtiquetas === 0 && (
                        <text
                          x={xCentro}
                          y={svgAlto - margen.abajo + 18}
                          textAnchor="middle"
                          className="grafico-texto-eje"
                        >
                          {formatearFechaCorta(dia.fecha)}
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
                  <strong>
                    {formatearFechaLarga(diaSeleccionado.fecha)}
                  </strong>
                </span>
                <span>
                  Total vendido:{' '}
                  <strong>{formatearMoneda(diaSeleccionado.total)}</strong>
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
