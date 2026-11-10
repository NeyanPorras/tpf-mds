import { test, expect } from '@playwright/test'

// Requiere MySQL con el seed y el backend levantados (ver playwright.config.mjs).
const VENDEDOR = { email: 'ventas@distribuidora.com', password: 'Venta123!' }

async function loguearVendedor(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(VENDEDOR.email)
  await page.getByLabel('Contraseña').fill(VENDEDOR.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Valen Vendedor')).toBeVisible()
}

test.describe('F5: pedidos con líneas y falta de stock', () => {
  test.beforeEach(async ({ page }) => {
    await loguearVendedor(page)
  })

  test('arma un pedido con líneas y lo deja PENDIENTE', async ({ page }) => {
    await page.goto('/pedidos')
    await page.getByRole('button', { name: 'Nuevo pedido' }).click()

    await page
      .locator('.modal select[name="cliente_id"]')
      .selectOption({ index: 1 })
    await page
      .locator('.modal select[name="producto_id"]')
      .selectOption({ index: 1 })
    await page.locator('.modal input[name="cantidad"]').fill('2')
    await page.getByRole('button', { name: 'Agregar' }).click()

    const lineas = page.locator('.modal .tabla-detalle tbody tr')
    await expect(lineas).toHaveCount(1)
    await expect(page.locator('.modal .pedido-total')).toBeVisible()

    await page.getByRole('button', { name: 'Crear pedido' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    const aviso = page.locator('.aviso-exito')
    await expect(aviso).toContainText('creado en estado PENDIENTE')

    const texto = await aviso.textContent()
    const id = Number(texto.match(/Pedido #(\d+)/)[1])
    const fila = page.locator('tr', { hasText: `#${id}` })
    await expect(fila).toContainText('PENDIENTE')

    // Limpieza: cancelar el pedido recién creado.
    page.on('dialog', (dialog) => dialog.accept())
    await fila.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.locator('.aviso-exito')).toContainText(
      `Pedido #${id} cancelado.`
    )
  })

  test('confirmar sin stock muestra qué producto falta y cuánto hay', async ({
    page,
  }) => {
    await page.goto('/pedidos')
    await page.locator('.filtros-barra select').selectOption('PENDIENTE')

    // El pedido 40 del seed pide más Quilmes en lata de las que hay.
    const fila = page.locator('tr', { hasText: '#40' })
    await expect(fila).toBeVisible()
    await fila.getByRole('button', { name: 'Confirmar' }).click()

    const alerta = page.locator('.modal .alerta-stock')
    await expect(alerta).toBeVisible()
    await expect(alerta).toContainText('Falta de stock')
    await expect(alerta).toContainText('pedido #40')
    await expect(alerta).toContainText('Solicitado')
    await expect(alerta).toContainText('Disponible')
    await expect(alerta).toContainText('se revirtió completa')

    // El ROLLBACK dejó el pedido como estaba: sigue PENDIENTE.
    await page.keyboard.press('Escape')
    await expect(page.locator('tr', { hasText: '#40' })).toContainText(
      'PENDIENTE'
    )
  })

  test('DEPOSITO no arma ni confirma pedidos; solo marca entregado', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Salir' }).click()
    await page.getByLabel('Email').fill('deposito@distribuidora.com')
    await page.getByLabel('Contraseña').fill('Deposito123!')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Dami Deposito')).toBeVisible()

    await page.goto('/pedidos')
    await expect(page.getByRole('button', { name: 'Nuevo pedido' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)

    await page.locator('.filtros-barra select').selectOption('CONFIRMADO')
    await expect(page.getByRole('button', { name: 'Entregar' }).first()).toBeVisible()
  })
})
