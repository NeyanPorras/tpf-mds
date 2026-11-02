import { test, expect } from '@playwright/test'

const ADMIN = { email: 'admin@distribuidora.com', password: 'Admin123!' }

async function loguearAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText('Ana Admin')).toBeVisible()
}

function generarCuit(prefijo = '30') {
  const medio = Math.floor(10000000 + Math.random() * 90000000)
  const digito = Math.floor(Math.random() * 9)
  return `${prefijo}-${medio}-${digito}`
}

test.describe('ABM F4: Batería exhaustiva de pruebas', () => {
  test.beforeEach(async ({ page }) => {
    await loguearAdmin(page)
  })

  // ==========================================
  // 1. CATEGORÍAS
  // ==========================================
  test('Categorías: validaciones de largo mínimo y caracteres máximos', async ({ page }) => {
    await page.goto('/categorias')
    await page.getByRole('button', { name: 'Nueva categoría' }).click()

    // 1 caracter -> falla validación min 2
    await page.getByLabel('Nombre *').fill('A')
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('Nombre debe tener al menos 2 caracteres.')).toBeVisible()

    // Cancelar con Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal')).toHaveCount(0)
  })

  test('Categorías: creación, edición completa y persistencia', async ({ page }) => {
    await page.goto('/categorias')
    const nombreOriginal = `Cat Orig ${Date.now()}`
    const nombreEditado = `Cat Edit ${Date.now()}`

    // Crear
    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByLabel('Nombre *').fill(nombreOriginal)
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)
    await expect(page.locator('table').getByText(nombreOriginal)).toBeVisible()

    // Editar
    const fila = page.locator('tr', { hasText: nombreOriginal })
    await fila.getByRole('button', { name: 'Editar' }).click()
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.getByLabel('Nombre *')).toHaveValue(nombreOriginal)

    await page.getByLabel('Nombre *').fill(nombreEditado)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    await expect(page.locator('table').getByText(nombreEditado)).toBeVisible()
    await expect(page.locator('table').getByText(nombreOriginal)).toHaveCount(0)
  })

  test('Categorías: error 409 al intentar eliminar una con productos asociados', async ({ page }) => {
    await page.goto('/categorias')
    // Gaseosas viene en el seed y tiene productos asociados
    const filaGaseosas = page.locator('tr', { hasText: 'Gaseosas' }).first()

    page.on('dialog', (dialog) => dialog.accept())
    await filaGaseosas.getByRole('button', { name: 'Eliminar' }).click()

    // Debe mostrar error de conflicto devuelto por backend
    await expect(page.locator('.aviso-error')).toBeVisible()
    await expect(page.locator('table').getByText('Gaseosas').first()).toBeVisible()
  })

  test('Categorías: eliminación exitosa de categoría sin relaciones', async ({ page }) => {
    await page.goto('/categorias')
    const nombreCat = `Cat Borrar ${Date.now()}`

    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByLabel('Nombre *').fill(nombreCat)
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.locator('table').getByText(nombreCat)).toBeVisible()

    // Aceptar confirmación y eliminar
    page.on('dialog', (dialog) => dialog.accept())
    const fila = page.locator('tr', { hasText: nombreCat })
    await fila.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page.getByText(`Categoría "${nombreCat}" eliminada.`)).toBeVisible()
    await expect(page.locator('table').getByText(nombreCat)).toHaveCount(0)
  })

  // ==========================================
  // 2. PROVEEDORES
  // ==========================================
  test('Proveedores: validación de formatos (CUIT y campos opcionales)', async ({ page }) => {
    await page.goto('/proveedores')
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click()

    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('Razón Social es obligatorio.')).toBeVisible()
    await expect(page.getByText('CUIT es obligatorio.')).toBeVisible()

    // CUIT con letras o guiones mal puestos
    await page.getByLabel('Razón Social *').fill('Proveedor Formato Invalido')
    await page.getByLabel('CUIT *').fill('30-123456-X')
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('El CUIT debe tener el formato XX-XXXXXXXX-X.')).toBeVisible()

    // Cerrar modal con la cruz
    await page.locator('.modal-cerrar').click()
    await expect(page.locator('.modal')).toHaveCount(0)
  })

  test('Proveedores: creación, edición y persistencia', async ({ page }) => {
    await page.goto('/proveedores')
    const razonOriginal = `Prov Orig ${Date.now()}`
    const razonEditada = `Prov Edit ${Date.now()}`
    const cuit = generarCuit('30')

    // Crear
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click()
    await page.getByLabel('Razón Social *').fill(razonOriginal)
    await page.getByLabel('CUIT *').fill(cuit)
    await page.getByLabel('Teléfono').fill('0342-4550000')
    await page.getByLabel('Email').fill('contacto@proveedor.com')
    await page.getByRole('button', { name: 'Crear' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)
    await expect(page.locator('table').getByText(razonOriginal)).toBeVisible()

    // Editar
    const fila = page.locator('tr', { hasText: razonOriginal })
    await fila.getByRole('button', { name: 'Editar' }).click()
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.getByLabel('CUIT *')).toHaveValue(cuit)

    await page.getByLabel('Razón Social *').fill(razonEditada)
    await page.getByLabel('Teléfono').fill('0342-9999999')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)
    await expect(page.locator('table').getByText(razonEditada)).toBeVisible()
    await expect(page.locator('table').getByText('0342-9999999')).toBeVisible()
  })

  test('Proveedores: error 409 al crear CUIT duplicado', async ({ page }) => {
    await page.goto('/proveedores')
    // Embotelladora del Litoral tiene CUIT 30-71234567-8 en el seed
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click()
    await page.getByLabel('Razón Social *').fill('Proveedor CUIT Clon')
    await page.getByLabel('CUIT *').fill('30-71234567-8')
    await page.getByRole('button', { name: 'Crear' }).click()

    // Formulario debe mostrar el 409 del backend
    await expect(page.locator('.formulario-error-general')).toBeVisible()
    await expect(page.locator('.formulario-error-general')).toContainText('Ya existe')
  })

  // ==========================================
  // 3. CLIENTES
  // ==========================================
  test('Clientes: validación de obligatorios, dirección y zonas permitidas', async ({ page }) => {
    await page.goto('/clientes')
    await page.getByRole('button', { name: 'Nuevo cliente' }).click()

    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('Razón Social es obligatorio.')).toBeVisible()
    await expect(page.getByText('CUIT es obligatorio.')).toBeVisible()
    await expect(page.getByText('Dirección es obligatorio.')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('.modal')).toHaveCount(0)
  })

  test('Clientes: creación, edición de zona y búsqueda por texto', async ({ page }) => {
    await page.goto('/clientes')
    const nombreCliente = `Almacén Sur ${Date.now()}`
    const cuit = generarCuit('20')

    // Crear en zona Sur
    await page.getByRole('button', { name: 'Nuevo cliente' }).click()
    await page.getByLabel('Razón Social *').fill(nombreCliente)
    await page.getByLabel('CUIT *').fill(cuit)
    await page.getByLabel('Dirección *').fill('Gral. López 456')
    await page.locator('.modal select[name="zona"]').selectOption('Sur')
    await page.getByRole('button', { name: 'Crear' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)
    await expect(page.locator('table').getByText(nombreCliente)).toBeVisible()

    // Probar búsqueda por texto
    await page.locator('.filtros-barra input[type="text"]').fill(nombreCliente)
    await expect(page.locator('table').getByText(nombreCliente)).toBeVisible()

    // Limpiar búsqueda y verificar
    await page.locator('.filtros-barra input[type="text"]').fill('')
    await expect(page.locator('table').getByText(nombreCliente)).toBeVisible()

    // Editar y cambiar de zona a Norte
    const fila = page.locator('tr', { hasText: nombreCliente })
    await fila.getByRole('button', { name: 'Editar' }).click()
    await page.locator('.modal select[name="zona"]').selectOption('Norte')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    // Filtrar por Norte: debe aparecer
    await page.locator('.filtros-barra select').selectOption('Norte')
    await expect(page.locator('table').getByText(nombreCliente)).toBeVisible()

    // Filtrar por Centro: no debe aparecer
    await page.locator('.filtros-barra select').selectOption('Centro')
    await expect(page.locator('table').getByText(nombreCliente)).toHaveCount(0)
  })

  // ==========================================
  // 4. PRODUCTOS & STOCK
  // ==========================================
  test('Productos: validación de precio y stock mínimo numéricos mayores a cero', async ({ page }) => {
    await page.goto('/productos')
    await page.getByRole('button', { name: 'Nuevo producto' }).click()

    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('Nombre es obligatorio.')).toBeVisible()
    await expect(page.getByText('Presentación es obligatorio.')).toBeVisible()
    await expect(page.getByText('Precio ($) es obligatorio.')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('.modal')).toHaveCount(0)
  })

  test('Productos: creación completa, inmutabilidad de stock en edición y actualización de precio', async ({ page }) => {
    await page.goto('/productos')
    const nombreProd = `Bebida Premium ${Date.now()}`

    // Crear
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.getByLabel('Nombre *').fill(nombreProd)
    await page.getByLabel('Presentación *').fill('750ml x6')
    await page.getByLabel('Precio ($) *').fill('8500')
    await page.getByLabel('Stock mínimo *').fill('15')
    await page.locator('.modal select[name="categoria_id"]').selectOption({ index: 1 })
    await page.locator('.modal select[name="proveedor_id"]').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Crear' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)

    // Buscar el producto
    await page.locator('.filtros-barra input[type="text"]').fill(nombreProd)
    const fila = page.locator('tr', { hasText: nombreProd })
    await expect(fila).toBeVisible()

    // El stock inicial debe arrancar en 0 (bajo mínimo 15)
    await expect(fila.locator('.stock-bajo')).toBeVisible()

    // Editar precio y presentación
    await fila.getByRole('button', { name: 'Editar' }).click()
    await expect(page.locator('.modal')).toBeVisible()
    // Verificar que NO existe campo editable para 'stock'
    await expect(page.locator('.modal input[name="stock"]')).toHaveCount(0)

    await page.getByLabel('Precio ($) *').fill('9200')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.locator('.modal')).toHaveCount(0)

    await expect(page.locator('tr', { hasText: nombreProd })).toContainText('$ 9.200,00')
  })

  test('Productos: flujo completo de ingreso de mercadería y actualización de stock', async ({ page }) => {
    await page.goto('/productos')
    const nombreProd = `Jugo Citrus ${Date.now()}`

    // Crear producto con stock inicial 0 y mínimo 20
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.getByLabel('Nombre *').fill(nombreProd)
    await page.getByLabel('Presentación *').fill('1L x8')
    await page.getByLabel('Precio ($) *').fill('3400')
    await page.getByLabel('Stock mínimo *').fill('20')
    await page.locator('.modal select[name="categoria_id"]').selectOption({ index: 1 })
    await page.locator('.modal select[name="proveedor_id"]').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Crear' }).click()

    // Filtrar producto
    await page.locator('.filtros-barra input[type="text"]').fill(nombreProd)
    const fila = page.locator('tr', { hasText: nombreProd })
    await expect(fila).toBeVisible()
    await expect(fila.locator('.stock-bajo')).toContainText('0')

    // Ingresar 50 unidades
    await fila.getByRole('button', { name: '+ Ingreso' }).click()
    await expect(page.locator('.modal')).toBeVisible()
    await page.getByLabel('Cantidad a ingresar *').fill('50')
    await page.getByLabel('Observación / Remito').fill('Remito R-0012')
    await page.getByRole('button', { name: 'Confirmar ingreso' }).click()

    await expect(page.locator('.modal')).toHaveCount(0)
    await expect(page.getByText('Ingreso registrado: se sumaron 50 unidades')).toBeVisible()

    // Verificar que el stock ahora es 50 y ya NO tiene la clase de stock bajo
    await expect(fila.locator('.stock-bajo')).toHaveCount(0)
    await expect(fila).toContainText('50')
  })

  test('Productos: filtros combinados (categoría, proveedor, bajo stock)', async ({ page }) => {
    await page.goto('/productos')

    // Filtro bajo mínimo
    await page.locator('.filtro-checkbox input').check()
    await expect(page.locator('table')).toBeVisible()

    // Filtro por proveedor
    const provSelect = page.locator('.filtros-barra select').nth(1)
    await provSelect.selectOption({ index: 1 })
    await expect(page.locator('table')).toBeVisible()

    // Desmarcar checkbox
    await page.locator('.filtro-checkbox input').uncheck()
    await expect(page.locator('table')).toBeVisible()
  })
})
