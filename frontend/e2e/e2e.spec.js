import { test, expect } from '@playwright/test'

// Flujos completos contra la API real y la base (uvicorn en 8000).
const ADMIN = { email: 'admin@distribuidora.com', password: 'Admin123!' }
const VENDEDOR = { email: 'ventas@distribuidora.com', password: 'Venta123!' }
const DEPOSITO = { email: 'deposito@distribuidora.com', password: 'Deposito123!' }

const NOMBRES = {
  [ADMIN.email]: 'Ana Admin',
  [VENDEDOR.email]: 'Valen Vendedor',
  [DEPOSITO.email]: 'Dami Deposito',
}

async function loguear(page, credenciales) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(credenciales.email)
  await page.getByLabel('Contraseña').fill(credenciales.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(NOMBRES[credenciales.email])).toBeVisible()
}

async function loguearAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Ana Admin')).toBeVisible()
}

// ------------------------------------------------------------------
// F2: menú y rutas por rol
// ------------------------------------------------------------------

test('ADMIN ve todo el menú, incluido Usuarios', async ({ page }) => {
  await loguearAdmin(page)
  const links = page.locator('.barra nav a')
  await expect(links).toHaveCount(7)
  await expect(page.locator('.barra nav')).toContainText('Clientes')
  await expect(page.locator('.barra nav')).toContainText('Usuarios')
})

test('VENDEDOR ve Clientes pero no Usuarios', async ({ page }) => {
  await loguear(page, VENDEDOR)
  const links = page.locator('.barra nav a')
  await expect(links).toHaveCount(6)
  await expect(page.locator('.barra nav')).toContainText('Clientes')
  await expect(page.locator('.barra nav')).not.toContainText('Usuarios')
})

test('DEPOSITO no ve ni Clientes ni Usuarios', async ({ page }) => {
  await loguear(page, DEPOSITO)
  const links = page.locator('.barra nav a')
  await expect(links).toHaveCount(5)
  await expect(page.locator('.barra nav')).not.toContainText('Clientes')
  await expect(page.locator('.barra nav')).not.toContainText('Usuarios')
})

test('DEPOSITO que escribe /clientes a mano vuelve al inicio', async ({ page }) => {
  await loguear(page, DEPOSITO)
  // Por menú no puede: la página de Clientes es de ADMIN/VENDEDOR.
  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/$/)
})

test('VENDEDOR que escribe /usuarios a mano vuelve al inicio', async ({ page }) => {
  await loguear(page, VENDEDOR)
  await page.goto('/usuarios')
  await expect(page).toHaveURL(/\/$/)
})

test('ADMIN sí entra a /usuarios', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/usuarios')
  await expect(page).toHaveURL(/\/usuarios$/)
  await expect(page.getByText('ABM de usuarios')).toBeVisible()
})

test('sin sesión, cualquier ruta interna manda al login', async ({ page }) => {
  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/pedidos')
  await expect(page).toHaveURL(/\/login$/)
})

test('con sesión activa el login te saca al inicio', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/$/)
})

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

test('un 401 de la API limpia la sesión y manda al login', async ({ page }) => {
  await loguearAdmin(page)
  // Meto un token truchado: el próximo request responde 401 y el
  // interceptor lo manda al login.
  await page.evaluate(() => localStorage.setItem('access_token', 'token-truchado'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar redirect por 401' }).click()
  await page.waitForURL(/\/login$/)
  await expect(page.locator('h1')).toContainText('Distribuidora de bebidas')
})

test('el listado de productos muestra datos reales y pagina', async ({ page }) => {
  await loguearAdmin(page)
  await page.goto('/productos')

  const primerProducto = page.locator('tbody tr').first().locator('td').first()
  await expect(primerProducto).toBeVisible()
  const deLaPrimera = await primerProducto.textContent()

  // Con las 30 filas del seed hay más de una página: cambia el primer producto.
  await expect(page.getByText(/Página 1 de [2-9]/)).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.locator('tbody tr').first().locator('td').first()).not.toHaveText(
    deLaPrimera ?? '',
  )
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
