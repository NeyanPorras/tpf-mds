// Reportes disponibles, con la forma de docs/contrato-api.md (sección Reportes).
// La misma definición arma la tabla en pantalla, el PDF y el Excel.
//
// filtros: 'fechas' (?desde=&hasta=), 'dias' (?dias=) o 'limite' (?limite=).
// tipo de columna: 'texto' (por defecto), 'numero', 'moneda' o 'fecha'.

const VENTAS = ['ADMIN', 'VENDEDOR']
const STOCK = ['ADMIN', 'DEPOSITO']

export const REPORTES = Object.freeze([
  {
    id: 'detalle-pedidos',
    titulo: 'Detalle de pedidos',
    descripcion: 'Cada línea vendida con su cliente, vendedor y producto (INNER JOIN).',
    roles: VENTAS,
    filtros: ['fechas'],
    columnas: [
      { clave: 'pedido_id', titulo: 'Pedido', tipo: 'numero' },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
      { clave: 'cliente', titulo: 'Cliente' },
      { clave: 'zona', titulo: 'Zona' },
      { clave: 'vendedor', titulo: 'Vendedor' },
      { clave: 'producto', titulo: 'Producto' },
      { clave: 'cantidad', titulo: 'Cantidad', tipo: 'numero' },
      { clave: 'subtotal', titulo: 'Subtotal', tipo: 'moneda' },
    ],
  },
  {
    id: 'clientes-sobre-promedio',
    titulo: 'Clientes sobre el promedio',
    descripcion: 'Clientes que compraron más que el promedio del período (subconsulta).',
    roles: VENTAS,
    filtros: ['fechas'],
    columnas: [
      { clave: 'cliente_id', titulo: 'ID', tipo: 'numero' },
      { clave: 'razon_social', titulo: 'Cliente' },
      { clave: 'total_comprado', titulo: 'Total comprado', tipo: 'moneda' },
      { clave: 'promedio_general', titulo: 'Promedio general', tipo: 'moneda' },
    ],
  },
  {
    id: 'ventas-por-zona-categoria',
    titulo: 'Ventas por zona y categoría',
    descripcion: 'Pedidos, unidades y total agrupados por zona y categoría (GROUP BY).',
    roles: VENTAS,
    filtros: ['fechas'],
    columnas: [
      { clave: 'zona', titulo: 'Zona' },
      { clave: 'categoria', titulo: 'Categoría' },
      { clave: 'pedidos', titulo: 'Pedidos', tipo: 'numero' },
      { clave: 'unidades', titulo: 'Unidades', tipo: 'numero' },
      { clave: 'total', titulo: 'Total', tipo: 'moneda' },
    ],
  },
  {
    id: 'ranking-productos',
    titulo: 'Ranking de productos',
    descripcion: 'Los productos más vendidos por unidades (GROUP BY).',
    roles: VENTAS,
    filtros: ['fechas', 'limite'],
    columnas: [
      { clave: 'producto_id', titulo: 'ID', tipo: 'numero' },
      { clave: 'nombre', titulo: 'Producto' },
      { clave: 'unidades', titulo: 'Unidades', tipo: 'numero' },
      { clave: 'total', titulo: 'Total', tipo: 'moneda' },
    ],
  },
  {
    id: 'productos-sin-ventas',
    titulo: 'Productos sin ventas',
    descripcion: 'Productos que no se vendieron en los últimos días indicados (subconsulta).',
    roles: STOCK,
    filtros: ['dias'],
    columnas: [
      { clave: 'producto_id', titulo: 'ID', tipo: 'numero' },
      { clave: 'nombre', titulo: 'Producto' },
      { clave: 'presentacion', titulo: 'Presentación' },
      { clave: 'stock', titulo: 'Stock', tipo: 'numero' },
    ],
  },
  {
    id: 'stock-bajo',
    titulo: 'Stock bajo',
    descripcion: 'Productos con stock en o por debajo del mínimo, con su proveedor.',
    roles: STOCK,
    filtros: [],
    columnas: [
      { clave: 'producto_id', titulo: 'ID', tipo: 'numero' },
      { clave: 'nombre', titulo: 'Producto' },
      { clave: 'stock', titulo: 'Stock', tipo: 'numero' },
      { clave: 'stock_minimo', titulo: 'Stock mínimo', tipo: 'numero' },
      { clave: 'proveedor', titulo: 'Proveedor' },
    ],
  },
])

/** Reportes que puede ver un rol. */
export function reportesDelRol(rol) {
  return REPORTES.filter((reporte) => reporte.roles.includes(rol))
}
