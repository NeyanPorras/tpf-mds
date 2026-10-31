import './Tabla.css'

export default function Tabla({
  columnas,
  filas = [],
  paginacion = null,
  cargando = false,
  mensajeVacio = 'No hay datos.',
}) {
  const { pagina, paginas, onPagina } = paginacion ?? {}

  return (
    <div className="tabla-marco">
      {cargando ? (
        <p className="tabla-leyenda">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="tabla-leyenda">{mensajeVacio}</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map((columna) => (
                <th key={columna.clave}>{columna.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id}>
                {columnas.map((columna) => (
                  <td key={columna.clave}>
                    {columna.render ? columna.render(fila) : fila[columna.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {paginas > 1 && (
        <div className="tabla-pie">
          <button type="button" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {paginas}
          </span>
          <button type="button" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
