import { test, expect } from '@playwright/test'

// Flujos completos contra la API real y la base (uvicorn en 8000).
const ADMIN = { email: 'admin@distribuidora.com', password: 'Admin123!' }

async function loguearAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Ana Admin')).toBeVisible()
}

test('el login rechaza credenciales incorrectas con un mensaje', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill('Incorrecta123!')
  await page.getByRole('button', { name: 'Ingresar' }).click()

  const error = page.locator('.error')
  await expect(error).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('el login correcto entra y muestra el usuario en la sidebar', async ({ page }) => {
  await loguearAdmin(page)
  await expect(page).toHaveURL(/\/$/)
})

test('sin sesión, un 401 redirige al login', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar redirect por 401' }).click()
  await page.waitForURL(/\/login$/)
  await expect(page.locator('h1')).toContainText('Distribuidora de bebidas')
})

test('el listado de productos muestra datos reales y pagina', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/productos')

  await expect(page.getByText('Coca-Cola').first()).toBeVisible()
  await expect(page.getByText('Página 1 de 2')).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Villavicencio')).toBeVisible()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
})

test('el formulario valida antes de enviar y muestra errores del backend', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/demo')

  // vacío: la validación del cliente corta el envío
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('Nombre es obligatorio.')).toBeVisible()

  // corta: la validación de largo mínimo
  await page.getByLabel('Nombre *').fill('A')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('debe tener al menos 2 caracteres')).toBeVisible()

  // duplicado: el 409 del backend se muestra como error general
  await page.getByLabel('Nombre *').fill('Gaseosas')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.locator('.formulario-error-general')).toContainText('Ya existe')

  // esc cierra el modal sin crear nada
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal')).toHaveCount(0)
})

test('se crea una categoría y aparece en la tabla', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/demo')

  const nombre = `E2E Categoría ${Date.now()}`
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  await page.getByLabel('Nombre *').fill(nombre)
  await page.getByRole('button', { name: 'Crear' }).click()

  await expect(page.getByText(`Categoría "${nombre}" creada.`)).toBeVisible()
  await expect(page.locator('table').getByText(nombre)).toBeVisible()
  await expect(page.locator('.modal')).toHaveCount(0)
})
