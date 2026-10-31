import { useState } from 'react'
import { mensajeDeError } from '../api/cliente.js'
import './Formulario.css'

export default function Formulario({
  campos,
  enEnviar,
  valoresIniciales = {},
  etiquetaEnviar = 'Guardar',
  disabled = false,
}) {
  const [valores, setValores] = useState({ ...valoresIniciales })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState(null)
  const [enviando, setEnviando] = useState(false)

  function validar(datos) {
    const fallas = {}
    for (const campo of campos) {
      const texto = String(datos[campo.nombre] ?? '').trim()
      const etiqueta = campo.etiqueta ?? campo.nombre

      if (campo.requerido && texto === '') {
        fallas[campo.nombre] = `${etiqueta} es obligatorio.`
        continue
      }
      if (texto === '') {
        continue
      }
      if (campo.min !== undefined && texto.length < campo.min) {
        fallas[campo.nombre] = `${etiqueta} debe tener al menos ${campo.min} caracteres.`
      }
      if (campo.max !== undefined && texto.length > campo.max) {
        fallas[campo.nombre] = `${etiqueta} admite hasta ${campo.max} caracteres.`
      }
      if (campo.tipo === 'number' && Number.isNaN(Number(texto))) {
        fallas[campo.nombre] = `${etiqueta} debe ser un número.`
      }
      if (campo.patron && !new RegExp(campo.patron).test(texto)) {
        fallas[campo.nombre] = campo.mensajePatron ?? `${etiqueta} tiene un formato inválido.`
      }
    }
    return fallas
  }

  function setValor(nombre, valor) {
    setValores((actuales) => ({ ...actuales, [nombre]: valor }))
    setErrores((actuales) => ({ ...actuales, [nombre]: undefined }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErrorGeneral(null)

    const datos = { ...valores }
    const fallas = validar(datos)
    if (Object.keys(fallas).length > 0) {
      setErrores(fallas)
      return
    }

    for (const campo of campos) {
      if (campo.tipo === 'number') {
        datos[campo.nombre] = Number(valores[campo.nombre])
      }
    }

    setEnviando(true)
    try {
      await enEnviar(datos)
      setValores({ ...valoresIniciales })
    } catch (error) {
      const detalles = error.response?.data?.error?.details
      if (error.response?.status === 422 && Array.isArray(detalles)) {
        const porCampo = {}
        for (const detalle of detalles) {
          porCampo[detalle.field] = detalle.message
        }
        setErrores(porCampo)
      } else {
        setErrorGeneral(mensajeDeError(error))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {campos.map((campo) => (
        <label key={campo.nombre} className="formulario-campo">
          <span>{campo.etiqueta}{campo.requerido && ' *'}</span>

          {campo.tipo === 'select' ? (
            <select
              name={campo.nombre}
              value={valores[campo.nombre] ?? ''}
              onChange={(evento) => setValor(campo.nombre, evento.target.value)}
              disabled={disabled || enviando}
            >
              {(campo.opciones ?? []).map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          ) : campo.tipo === 'textarea' ? (
            <textarea
              name={campo.nombre}
              value={valores[campo.nombre] ?? ''}
              onChange={(evento) => setValor(campo.nombre, evento.target.value)}
              placeholder={campo.placeholder}
              rows={3}
              disabled={disabled || enviando}
            />
          ) : (
            <input
              type={campo.tipo ?? 'text'}
              name={campo.nombre}
              value={valores[campo.nombre] ?? ''}
              onChange={(evento) => setValor(campo.nombre, evento.target.value)}
              placeholder={campo.placeholder}
              disabled={disabled || enviando}
            />
          )}

          {errores[campo.nombre] && <p className="formulario-error">{errores[campo.nombre]}</p>}
        </label>
      ))}

      {errorGeneral && <p className="formulario-error formulario-error-general">{errorGeneral}</p>}

      <button type="submit" disabled={disabled || enviando}>
        {enviando ? 'Guardando…' : etiquetaEnviar}
      </button>
    </form>
  )
}
