import './PaginaPlaceholder.css'

interface Props {
  titulo: string
  descripcion: string
  tarea?: string
}

export default function PaginaPlaceholder({ titulo, descripcion, tarea }: Props) {
  return (
    <section className="placeholder">
      <h2>{titulo}</h2>
      <p>{descripcion}</p>
      {tarea && <p className="tarea">{tarea}</p>}
    </section>
  )
}
