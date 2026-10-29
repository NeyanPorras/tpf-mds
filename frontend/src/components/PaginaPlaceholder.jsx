import './PaginaPlaceholder.css'

export default function PaginaPlaceholder({ titulo, descripcion, tarea }) {
  return (
    <section className="placeholder">
      <h2>{titulo}</h2>
      <p>{descripcion}</p>
      {tarea && <p className="tarea">{tarea}</p>}
    </section>
  )
}
