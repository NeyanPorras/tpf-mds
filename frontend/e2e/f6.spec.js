import { test, expect } from '@playwright/test'

const ADMIN = { email: 'admin@distribuidora.com', password: 'Admin123!' }
const DEPOSITO = { email: 'deposito@distribuidora.com', password: 'Deposito123!' }
const VENDEDOR = { email: 'ventas@distribuidora.com', password: 'Venta123!' }

async function loguearUsuario(page, creds, nombreEsperado) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Contraseña').fill(creds.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(nombreEsperado)).toBeVisible()
}

test.describe('Dashboard F6: Indicadores, Gráfico y Filtros con datos reales', () => {
  test('Carga el dashboard con sus 4 tarjetas de indicadores y datos reales de la base', async ({ page }) => {
    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Título y filtros visibles
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByLabel('Desde')).toBeVisible()
    await expect(page.getByLabel('Hasta')).toBeVisible()

    // 4 tarjetas de indicadores presentes
    await expect(page.getByText('Ventas del período')).toBeVisible()
    await expect(page.getByText('Clientes activos')).toBeVisible()
    await expect(page.getByText('Pedidos pendientes')).toBeVisible()
    await expect(page.getByText('Stock bajo')).toBeVisible()

    // En la base real, los productos bajo mínimo están cargados (semilla = 4)
    const tarjetaStock = page.locator('.tarjeta-metrica', { hasText: 'Stock bajo' })
    await expect(tarjetaStock).toContainText('4')

    // Enlaces de navegación rápida
    await expect(page.getByRole('link', { name: 'Ver pedidos →' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver productos →' })).toBeVisible()
  })

  test('Renderiza el gráfico SVG interactivo con ventas diarias y tooltips', async ({ page }) => {
    // Simulamos respuesta de ventas del contrato para verificar renderizado del SVG
    await page.route('**/api/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ventas_mes: 4850000.0,
          pedidos_pendientes: 7,
          productos_bajo_minimo: 4,
          clientes_activos: 12,
          ventas_por_dia: [
            { fecha: '2026-11-01', total: 320000.0 },
            { fecha: '2026-11-02', total: 450000.0 },
            { fecha: '2026-11-03', total: 280000.0 },
          ],
        }),
      })
    })

    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Las tarjetas reflejan los datos
    const tarjetaVentas = page.locator('.tarjeta-metrica', { hasText: 'Ventas del período' })
    await expect(tarjetaVentas).toContainText('$')

    // El gráfico SVG de barras debe estar presente y tener 3 barras renderizadas
    const svgGrafico = page.locator('.grafico-svg')
    await expect(svgGrafico).toBeVisible()

    const barras = page.locator('.grafico-barra')
    await expect(barras).toHaveCount(3)

    // Al interactuar con una barra, muestra el detalle en pantalla
    await barras.first().hover()
    await expect(page.locator('.grafico-info-detalle')).toBeVisible()
    await expect(page.locator('.grafico-info-detalle')).toContainText('Total vendido:')
  })

  test('Validación de fechas: si desde > hasta muestra mensaje de error 422', async ({ page }) => {
    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Fechas invertidas contra el backend real
    await page.getByLabel('Desde').fill('2026-11-30')
    await page.getByLabel('Hasta').fill('2026-11-01')
    await page.getByRole('button', { name: 'Actualizar' }).click()

    await expect(
      page.getByText("La fecha 'desde' no puede ser posterior a 'hasta'."),
    ).toBeVisible()
  })

  test('Navegación desde las tarjetas de acceso rápido', async ({ page }) => {
    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Ir a pedidos
    await page.getByRole('link', { name: 'Ver pedidos →' }).click()
    await expect(page).toHaveURL(/\/pedidos/)

    // Volver a dashboard
    await page.goto('/')

    // Ir a productos
    await page.getByRole('link', { name: 'Ver productos →' }).click()
    await expect(page).toHaveURL(/\/productos/)
  })

  test('El dashboard es visible y funcional para rol VENDEDOR', async ({ page }) => {
    await loguearUsuario(page, VENDEDOR, 'Valen Vendedor')
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Ventas del período')).toBeVisible()
    await expect(page.getByText('Clientes activos')).toBeVisible()

    // Cambia fechas con los presets
    await page.getByRole('button', { name: 'Últimos 30 días' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('El dashboard es visible y funcional para rol DEPOSITO', async ({ page }) => {
    await loguearUsuario(page, DEPOSITO, 'Dami Deposito')
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Pedidos pendientes')).toBeVisible()
    await expect(page.getByText('Stock bajo')).toBeVisible()

    // Verifica dato real de la base
    const tarjetaStock = page.locator('.tarjeta-metrica', { hasText: 'Stock bajo' })
    await expect(tarjetaStock).toContainText('4')
  })
})
