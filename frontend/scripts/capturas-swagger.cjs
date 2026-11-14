// Regenera las capturas de Swagger de docs/capturas/.
// Necesita la base y el backend levantados (ver README). Desde frontend/:
//   node scripts/capturas-swagger.cjs
const { chromium } = require('@playwright/test')
const path = require('path')

const SALIDA = process.argv[2] ?? path.join(__dirname, '..', '..', 'docs', 'capturas')
const DOCS = 'http://localhost:8000/docs'
const API = 'http://localhost:8000/api'

async function token(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await r.json()).access_token
}

async function abrir(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(DOCS)
  await page.locator('.opblock').first().waitFor()
  return page
}

function operacion(page, metodo, ruta) {
  return page.locator(`.opblock-${metodo}`).filter({
    has: page.locator('.opblock-summary-path', { hasText: new RegExp(`^${ruta.replace(/[{}]/g, '\\$&')}$`) }),
  })
}

async function ejecutar(page, metodo, ruta, { body, params } = {}) {
  const op = operacion(page, metodo, ruta)
  await op.locator('.opblock-summary').click()
  await op.getByRole('button', { name: 'Try it out' }).click()
  for (const [nombre, valor] of Object.entries(params ?? {})) {
    await op.locator(`input[placeholder="${nombre}"]`).fill(String(valor))
  }
  if (body) await op.locator('textarea.body-param__text').fill(JSON.stringify(body, null, 2))
  await op.getByRole('button', { name: 'Execute' }).click()
  await op.locator('.live-responses-table .response-col_status').first().waitFor()
  await op.locator('.live-responses-table').scrollIntoViewIfNeeded()
  return op
}

async function autorizar(page, jwt) {
  await page.locator('.btn.authorize').first().click()
  await page.locator('.modal-ux input[type="text"]').fill(jwt)
  await page.locator('.modal-ux .auth-btn-wrapper button.authorize').click()
}

async function guardar(locator, nombre) {
  await locator.screenshot({ path: path.join(SALIDA, nombre) })
  console.log('ok', nombre)
}

;(async () => {
  const browser = await chromium.launch()
  const admin = await token('admin@distribuidora.com', 'Admin123!')
  const vendedor = await token('ventas@distribuidora.com', 'Venta123!')

  // 1. Todos los endpoints, agrupados por recurso.
  let page = await abrir(browser)
  await page.screenshot({ path: path.join(SALIDA, '01-endpoints.png'), fullPage: true })
  console.log('ok 01-endpoints.png')

  // 2. Login: devuelve el JWT y el usuario.
  let op = await ejecutar(page, 'post', '/api/auth/login', {
    body: { email: 'admin@distribuidora.com', password: 'Admin123!' },
  })
  await guardar(op, '02-login-jwt.png')

  // 3. Authorize con el token (el candado de Swagger).
  await page.locator('.btn.authorize').first().click()
  await page.locator('.modal-ux input[type="text"]').fill(admin)
  await guardar(page.locator('.modal-ux'), '03-authorize.png')
  await page.close()

  // 4. Sin token: 401.
  page = await abrir(browser)
  op = await ejecutar(page, 'get', '/api/usuarios')
  await guardar(op, '04-sin-token-401.png')
  await page.close()

  // 5. Con token de VENDEDOR en un recurso de ADMIN: 403.
  page = await abrir(browser)
  await autorizar(page, vendedor)
  await page.locator('.modal-ux .btn-done, .modal-ux .close-modal').first().click()
  op = await ejecutar(page, 'get', '/api/usuarios')
  await guardar(op, '05-rol-sin-permiso-403.png')

  // 6. Confirmar el pedido 40: el procedimiento hace ROLLBACK por falta de stock.
  op = await ejecutar(page, 'post', '/api/pedidos/{id_pedido}/confirmar', { params: { id_pedido: 40 } })
  await guardar(op, '06-confirmar-sin-stock-409.png')
  await page.close()

  // 7. Con token de ADMIN: el listado de usuarios nunca trae la contraseña.
  page = await abrir(browser)
  await autorizar(page, admin)
  await page.locator('.modal-ux .btn-done, .modal-ux .close-modal').first().click()
  op = await ejecutar(page, 'get', '/api/usuarios')
  await guardar(op, '07-usuarios-admin-200.png')

  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
