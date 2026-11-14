import { test, expect } from '@playwright/test'

// Requiere MySQL con el seed y el backend levantados (ver playwright.config.mjs).
// Cada corrida crea un usuario con email único; como la baja es lógica,
// queda inactivo en la base de desarrollo.
const ADMIN = { email: 'admin@distribuidora.com', password: 'Admin123!', nombre: 'Ana Admin' }

async function loguear(page, { email, password, nombre }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(nombre)).toBeVisible()
}

async function salir(page) {
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test('ciclo de un usuario: alta, login con su rol, desactivación y reactivación', async ({ page }) => {
  const nuevo = {
    nombre: 'Lu Logística',
    email: `lu-${Date.now()}@distribuidora.com`,
    password: 'Logistica1',
  }

  await loguear(page, ADMIN)
  await page.goto('/usuarios')

  // Alta: la validación del cliente frena una contraseña sin número.
  await page.getByRole('button', { name: 'Nuevo usuario' }).click()
  const modal = page.locator('.modal')
  await modal.locator('input[name="nombre"]').fill(nuevo.nombre)
  await modal.locator('input[name="email"]').fill(nuevo.email)
  await modal.locator('input[name="password"]').fill('sinnumeros')
  await modal.locator('select[name="rol"]').selectOption('DEPOSITO')
  await modal.getByRole('button', { name: 'Crear' }).click()
  await expect(modal).toContainText('Mínimo 8 caracteres y al menos un número.')

  await modal.locator('input[name="password"]').fill(nuevo.password)
  await modal.getByRole('button', { name: 'Crear' }).click()
  await expect(page.locator('.modal')).toHaveCount(0)
  const fila = page.locator('tbody tr', { hasText: nuevo.email })
  await expect(fila).toContainText('DEPOSITO')
  await expect(fila).toContainText('Activo')

  // El usuario nuevo entra con su contraseña y su rol: sin Usuarios ni Clientes.
  await salir(page)
  await loguear(page, nuevo)
  await expect(page.locator('.barra nav')).not.toContainText('Usuarios')
  await expect(page.locator('.barra nav')).not.toContainText('Clientes')
  await salir(page)

  // El admin lo desactiva.
  await loguear(page, ADMIN)
  await page.goto('/usuarios')
  page.once('dialog', (dialogo) => dialogo.accept())
  await fila.getByRole('button', { name: 'Desactivar' }).click()
  await expect(fila).toContainText('Inactivo')

  // Desactivado: el login lo rechaza.
  await salir(page)
  await page.getByLabel('Email').fill(nuevo.email)
  await page.getByLabel('Contraseña').fill(nuevo.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Credenciales incorrectas.')).toBeVisible()

  // Reactivado: vuelve a entrar.
  await loguear(page, ADMIN)
  await page.goto('/usuarios')
  page.once('dialog', (dialogo) => dialogo.accept())
  await fila.getByRole('button', { name: 'Reactivar' }).click()
  await expect(fila).toContainText('Activo')
  await salir(page)
  await loguear(page, nuevo)
})

test('el admin no puede desactivarse ni cambiarse el rol a sí mismo', async ({ page }) => {
  await loguear(page, ADMIN)
  await page.goto('/usuarios')
  const yo = page.locator('tbody tr', { hasText: ADMIN.email })
  await expect(yo).toContainText('(vos)')
  await expect(yo.getByRole('button', { name: 'Desactivar' })).toHaveCount(0)
  await yo.getByRole('button', { name: 'Editar' }).click()
  await expect(page.locator('.modal select[name="rol"]')).toHaveCount(0)
})
