import { test, expect } from '@playwright/test'

// Testeo profundo de F2: matriz completa rol × ruta contra la API real.
// Cubre lo que protege la tarea: cada rol ve solo su menú y ninguna ruta
// interna es alcanzable (ni por menú ni escribiendo la URL a mano) con un
// rol que no corresponde.

const USUARIOS = {
  ADMIN: { email: 'admin@distribuidora.com', password: 'Admin123!', nombre: 'Ana Admin' },
  VENDEDOR: { email: 'ventas@distribuidora.com', password: 'Venta123!', nombre: 'Valen Vendedor' },
  DEPOSITO: { email: 'deposito@distribuidora.com', password: 'Deposito123!', nombre: 'Dami Deposito' },
}

// Igual que la tabla "Permisos por rol" de docs/contrato-api.md y el
// mapa de src/api/permisos.js. Si ambos cambian, cambia acá.
const MATRIZ = {
  ADMIN: {
    '/': true, '/productos': true, '/clientes': true, '/pedidos': true,
    '/reportes': true, '/usuarios': true, '/demo': true,
  },
  VENDEDOR: {
    '/': true, '/productos': true, '/clientes': true, '/pedidos': true,
    '/reportes': true, '/usuarios': false, '/demo': true,
  },
  DEPOSITO: {
    '/': true, '/productos': true, '/clientes': false, '/pedidos': true,
    '/reportes': true, '/usuarios': false, '/demo': true,
  },
}

const RUTAS = ['/', '/productos', '/clientes', '/pedidos', '/reportes', '/usuarios', '/demo']

/** Loguea por la UI real y espera ver el nombre en la barra. */
async function loguear(page, credenciales) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(credenciales.email)
  await page.getByLabel('Contraseña').fill(credenciales.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(credenciales.nombre)).toBeVisible()
}

test.describe('matriz rol × ruta', () => {
  for (const [rol, ruta_booleana] of Object.entries(MATRIZ)) {
    for (const ruta of RUTAS) {
      const permitida = ruta_booleana[ruta]
      test(`${rol} ${permitida ? 'entra a' : 'es rechazado en'} ${ruta}`, async ({ page }) => {
        await loguear(page, USUARIOS[rol])
        await page.goto(ruta)
        if (permitida) {
          await expect(page).toHaveURL(ruta === '/' ? /\/$/ : new RegExp(`${ruta.replace('/', '\\/')}$`))
        } else {
          // El menú no la trae y la guarda la manda al inicio.
          await expect(page).toHaveURL(/\/$/)
          // Si sale por el inicio, el menú tampoco la debería traer.
          const oculto = { '/clientes': 'Clientes', '/usuarios': 'Usuarios' }[ruta]
          if (oculto) {
            await expect(page.locator('.barra nav')).not.toContainText(oculto)
          }
        }
      })
    }
  }
})

test('ruta inexistente: vuelve al inicio sin romper nada', async ({ page }) => {
  await loguear(page, USUARIOS.ADMIN)
  await page.goto('/pagina-que-no-existe')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Ana Admin')).toBeVisible()
})

test('usuario con JSON corrupto en localStorage: no abre nada', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('usuario', '{esto-no-es-json')
    localStorage.setItem('access_token', 'token-truchado')
  })
  await page.goto('/')
  // getUsuario() limpia el basura y devuelve null: manda al login.
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Distribuidora de bebidas')).toBeVisible()
})

test('usuario sin rol en la sesión: no rompe pero no ve menú', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Fernando', email: 'f@f.com' }))
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.barra nav a')).toHaveCount(0)
})

test('Salir limpia la sesión y las rutas quedan bloqueadas', async ({ page }) => {
  await loguear(page, USUARIOS.ADMIN)
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
  // Después de salir, /pedidos ya no es alcanzable.
  await page.goto('/pedidos')
  await expect(page).toHaveURL(/\/login$/)
})

test('recargar la página mantiene la sesión y el menú', async ({ page }) => {
  await loguear(page, USUARIOS.ADMIN)
  await page.reload()
  await expect(page.getByText('Ana Admin')).toBeVisible()
  await expect(page.locator('.barra nav a')).toHaveCount(7)
})
