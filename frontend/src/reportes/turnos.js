/**
 * Numera las consultas para descartar respuestas viejas.
 *
 * Si una consulta tarda y mientras tanto el usuario consulta de nuevo o
 * cambia un filtro, la respuesta anterior puede llegar después. Cada
 * consulta toma un turno con siguiente() y, al recibir la respuesta, solo
 * la muestra si esVigente(turno). invalidar() descarta la consulta en curso.
 */
export function crearTurnos() {
  let actual = 0
  return {
    siguiente: () => ++actual,
    esVigente: (turno) => turno === actual,
    invalidar: () => {
      actual += 1
    },
  }
}
