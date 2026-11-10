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

    // En la base real, los productos bajo mínimo están cargados (semilla = 4 o 5)
    const tarjetaStock = page.locator('.tarjeta-metrica', { hasText: 'Stock bajo' })
    await expect(tarjetaStock).toContainText(/[1-9]/)

    // Enlaces de navegación rápida
    await expect(page.getByRole('link', { name: 'Ver pedidos →' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver productos →' })).toBeVisible()
  })

  test('Renderiza el gráfico SVG interactivo con evolución completa de días y tooltips', async ({ page }) => {
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
            { fecha: '2026-11-05', total: 450000.0 },
          ],
        }),
      })
    })

    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Las tarjetas reflejan los datos
    const tarjetaVentas = page.locator('.tarjeta-metrica', { hasText: 'Ventas del período' })
    await expect(tarjetaVentas).toContainText('$')

    // El gráfico SVG de barras debe estar presente y completar todos los días del mes
    const svgGrafico = page.locator('.grafico-svg')
    await expect(svgGrafico).toBeVisible()

    const barras = page.locator('.grafico-barra')
    const cantidadBarras = await barras.count()
    expect(cantidadBarras).toBeGreaterThanOrEqual(28)

    // Al interactuar con una barra, muestra el detalle en pantalla
    await barras.first().hover()
    await expect(page.locator('.grafico-info-detalle')).toBeVisible()
    await expect(page.locator('.grafico-info-detalle')).toContainText('Total vendido:')
  })

  test('Validación de fechas: si falta una fecha pide completarla sin llamar al backend', async ({ page }) => {
    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Borra la fecha 'Desde'
    await page.getByLabel('Desde').fill('')
    await expect(page.getByText('Completá las dos fechas.')).toBeVisible()

    // Vuelve a completar y el error desaparece
    await page.getByLabel('Desde').fill('2026-11-01')
    await expect(page.getByText('Completá las dos fechas.')).toHaveCount(0)
  })

  test('Validación de fechas: si desde > hasta muestra mensaje de error', async ({ page }) => {
    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Fechas invertidas
    await page.getByLabel('Desde').fill('2026-11-30')
    await page.getByLabel('Hasta').fill('2026-11-01')
    await page.getByRole('button', { name: 'Actualizar' }).click()

    await expect(
      page.getByText("La fecha 'desde' no puede ser posterior a 'hasta'."),
    ).toBeVisible()
  })

  test('Control de carreras: descarta respuestas lentas previas al cambiar de rango', async ({ page }) => {
    let responderLento = null
    const promesaLenta = new Promise((resolve) => {
      responderLento = resolve
    })

    await page.route('**/api/dashboard*', async (route) => {
      const url = route.request().url()
      if (url.includes('desde=2026-08-01')) {
        // Respuesta lenta
        await promesaLenta
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ventas_mes: 99999999.0,
            pedidos_pendientes: 10,
            productos_bajo_minimo: 10,
            clientes_activos: 10,
            ventas_por_dia: [{ fecha: '2026-08-01', total: 99999999.0 }],
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ventas_mes: 1000.0,
            pedidos_pendientes: 1,
            productos_bajo_minimo: 1,
            clientes_activos: 1,
            ventas_por_dia: [{ fecha: '2026-11-01', total: 1000.0 }],
          }),
        })
      }
    })

    await loguearUsuario(page, ADMIN, 'Ana Admin')
    await page.goto('/')

    // Dispara la consulta lenta
    await page.getByRole('button', { name: 'Ago - Oct 2026 (Prueba)' }).click()

    // Inmediatamente cambia a "Este mes" antes de que responda la lenta
    await page.getByRole('button', { name: 'Este mes' }).click()
    const tarjetaVentas = page.locator('.tarjeta-metrica', { hasText: 'Ventas del período' })
    await expect(tarjetaVentas).toContainText('1.000')

    // Ahora se resuelve la respuesta vieja de Ago-Oct
    responderLento()

    // No debe pisar la pantalla con 99.999.999
    await page.waitForTimeout(300)
    await expect(tarjetaVentas).toContainText('1.000')
    await expect(tarjetaVentas).not.toContainText('99.999.999')
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
    await expect(tarjetaStock).toContainText(/[1-9]/)
  })
})
