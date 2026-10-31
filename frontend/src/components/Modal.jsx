import { useEffect } from 'react'
import './Modal.css'

export default function Modal({ abierto, titulo, onCerrar, children }) {
  useEffect(() => {
    if (!abierto) {
      return undefined
    }
    function alTeclear(evento) {
      if (evento.key === 'Escape') {
        onCerrar()
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierto, onCerrar])

  if (!abierto) {
    return null
  }

  return (
    <div
      className="modal-fondo"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="modal-cabecera">
          <h3>{titulo}</h3>
          <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
