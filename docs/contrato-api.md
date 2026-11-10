# Contrato de la API

Fuente única de verdad entre backend y frontend. Si un endpoint cambia, se cambia **primero acá** (en un PR) y después en el código.

- Base URL: `http://localhost:8000/api`
- Formato: JSON, UTF-8. Fechas en ISO 8601 (`2026-11-03T14:30:00`). Montos como número con 2 decimales.
- Autenticación: header `Authorization: Bearer <token>` en todos los endpoints salvo `POST /auth/login`.
- Roles: `ADMIN`, `VENDEDOR`, `DEPOSITO`.

## Convenciones

### Listados paginados

`GET` de colecciones acepta `?page=1&size=20` y responde:

```json
{ "items": [ ... ], "total": 134, "page": 1, "size": 20 }
```

### Errores

Todas las respuestas de error tienen la misma forma:

```json
{ "error": { "code": "STOCK_INSUFICIENTE", "message": "No hay stock suficiente de Coca-Cola 2.25L x6", "details": null } }
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | Regla de negocio violada (ej. confirmar un pedido sin líneas) |
| 401 | `UNAUTHORIZED` | Falta el token, es inválido o venció |
| 403 | `FORBIDDEN` | El rol no tiene permiso |
| 404 | `NOT_FOUND` | El recurso no existe |
| 409 | `CONFLICT` / `STOCK_INSUFICIENTE` / `ESTADO_INVALIDO` | Duplicado (CUIT, email), falta de stock o transición de estado no permitida |
| 422 | `VALIDATION_ERROR` | Datos con tipo o formato incorrecto. `details` lista los campos: `[{ "field": "precio", "message": "Debe ser mayor a 0" }]` |
| 500 | `INTERNAL_ERROR` | Error no previsto (nunca expone SQL ni stack trace) |

## Permisos por rol

| Recurso | ADMIN | VENDEDOR | DEPOSITO |
|---|---|---|---|
| Usuarios | CRUD | — | — |
| Categorías, proveedores | CRUD | Leer | Leer |
| Productos | CRUD | Leer | Leer + ingreso de mercadería |
| Clientes | CRUD | CRUD | — |
| Pedidos | Todo | Crear, leer, confirmar, cancelar | Leer, marcar entregado |
| Reportes y dashboard | Todo | Ventas | Stock |

---

## Auth

### `POST /auth/login`

```json
// request
{ "email": "admin@distribuidora.com", "password": "Admin123!" }
// 200
{ "access_token": "eyJhbGciOi...", "token_type": "bearer", "expires_in": 3600,
  "usuario": { "id": 1, "nombre": "Ana Admin", "email": "admin@distribuidora.com", "rol": "ADMIN" } }
```

Credenciales incorrectas → `401` con el mismo mensaje sea cual sea el campo que falló.

### `GET /auth/me`

Devuelve el objeto `usuario` del token actual.

## Usuarios (solo ADMIN)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/usuarios` | — | Listado paginado de `Usuario` |
| POST | `/usuarios` | `UsuarioCrear` | `201` + `Usuario` |
| PUT | `/usuarios/{id}` | `UsuarioEditar` | `Usuario` |
| DELETE | `/usuarios/{id}` | — | `204` |

```json
// Usuario
{ "id": 2, "nombre": "Valen Vendedor", "email": "ventas@distribuidora.com", "rol": "VENDEDOR", "activo": true }
// UsuarioCrear
{ "nombre": "Valen Vendedor", "email": "ventas@distribuidora.com", "password": "Venta123!", "rol": "VENDEDOR" }
// UsuarioEditar: mismos campos, todos opcionales; password solo si se cambia
```

Validación: email válido y único; password mínimo 8 caracteres con al menos un número.

## Categorías

`GET /categorias` · `POST /categorias` · `PUT /categorias/{id}` · `DELETE /categorias/{id}`

```json
{ "id": 1, "nombre": "Gaseosas" }
```

Nombre obligatorio, 2–50 caracteres, único. Borrar una categoría con productos → `409`.

## Proveedores

`GET /proveedores` · `GET /proveedores/{id}` · `POST /proveedores` · `PUT /proveedores/{id}` · `DELETE /proveedores/{id}`

```json
{ "id": 1, "razon_social": "Embotelladora del Litoral S.A.", "cuit": "30-71234567-8", "telefono": "0342-4551234", "email": "ventas@embolitoral.com" }
```

CUIT con formato `XX-XXXXXXXX-X` y único.

## Productos

`GET /productos` · `GET /productos/{id}` · `POST /productos` · `PUT /productos/{id}` · `DELETE /productos/{id}`

Filtros de `GET /productos`: `?categoria_id=1&proveedor_id=2&buscar=coca&bajo_minimo=true`

```json
// Producto (respuesta)
{ "id": 10, "nombre": "Coca-Cola", "presentacion": "2.25L x6", "precio": 12500.00,
  "stock": 84, "stock_minimo": 20,
  "categoria": { "id": 1, "nombre": "Gaseosas" },
  "proveedor": { "id": 1, "razon_social": "Embotelladora del Litoral S.A." } }
// ProductoCrear / ProductoEditar (request)
{ "nombre": "Coca-Cola", "presentacion": "2.25L x6", "precio": 12500.00, "stock_minimo": 20, "categoria_id": 1, "proveedor_id": 1 }
```

- `stock` **no** se edita por este endpoint: solo cambia con ingresos de mercadería o pedidos confirmados.
- `precio > 0`, `stock_minimo >= 0`.

### `POST /productos/{id}/ingresos` (ADMIN, DEPOSITO)

Registra un movimiento de ENTRADA y suma stock.

```json
// request
{ "cantidad": 120, "observacion": "Remito 0001-00004521" }
// 201
{ "movimiento_id": 311, "producto_id": 10, "stock_actual": 204 }
```

### `GET /productos/{id}/movimientos`

Listado paginado: `{ "id", "tipo": "ENTRADA|SALIDA", "cantidad", "fecha", "usuario": {"id","nombre"}, "pedido_id": null }`

## Clientes

`GET /clientes` (filtros `?zona=Centro&buscar=`) · `GET /clientes/{id}` · `POST /clientes` · `PUT /clientes/{id}` · `DELETE /clientes/{id}`

```json
{ "id": 5, "razon_social": "Almacén Don Pepe", "cuit": "20-28765432-1", "direccion": "San Martín 1234", "zona": "Centro", "telefono": "342-155667788" }
```

Zonas válidas: `Centro`, `Norte`, `Sur`.

## Pedidos

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/pedidos?estado=&cliente_id=&desde=&hasta=` | Listado paginado (sin líneas) |
| GET | `/pedidos/{id}` | Pedido con sus líneas |
| POST | `/pedidos` | Crea un pedido `PENDIENTE` con sus líneas |
| PUT | `/pedidos/{id}` | Reemplaza las líneas (solo si está `PENDIENTE`) |
| POST | `/pedidos/{id}/confirmar` | Llama a `sp_confirmar_pedido` |
| POST | `/pedidos/{id}/cancelar` | Solo desde `PENDIENTE` |
| POST | `/pedidos/{id}/entregar` | Solo desde `CONFIRMADO` |

Transiciones válidas: `PENDIENTE → CONFIRMADO → ENTREGADO` y `PENDIENTE → CANCELADO`. Cualquier otra → `409 ESTADO_INVALIDO`.

```json
// POST /pedidos (request)
{ "cliente_id": 5, "lineas": [ { "producto_id": 10, "cantidad": 3 }, { "producto_id": 14, "cantidad": 10 } ] }
// Pedido (respuesta)
{ "id": 41, "fecha": "2026-11-03T10:15:00", "estado": "PENDIENTE", "total": 0.00,
  "cliente": { "id": 5, "razon_social": "Almacén Don Pepe" },
  "vendedor": { "id": 2, "nombre": "Valen Vendedor" },
  "lineas": [ { "id": 90, "producto": { "id": 10, "nombre": "Coca-Cola", "presentacion": "2.25L x6" }, "cantidad": 3, "precio_unitario": 12500.00, "subtotal": 37500.00 } ] }
```

- `precio_unitario` lo copia el backend del producto al crear la línea (el cliente no lo manda).
- `total` se calcula al confirmar.
- `cantidad > 0`, al menos una línea, sin productos repetidos.

`POST /pedidos/{id}/confirmar` → `200` con el `Pedido` confirmado, o:

```json
// 409
{ "error": { "code": "STOCK_INSUFICIENTE", "message": "No hay stock suficiente de Coca-Cola 2.25L x6",
  "details": { "producto_id": 10, "solicitado": 300, "disponible": 84 } } }
```

## Reportes

Los que filtran por fecha aceptan `?desde=2026-08-01&hasta=2026-10-31` (por defecto, el mes actual). `hasta` incluye el día completo. Si `desde` es posterior a `hasta`, responde `422 VALIDATION_ERROR`. Solo cuentan como venta los pedidos `CONFIRMADO` o `ENTREGADO`.

Quién los ve: VENDEDOR los de ventas, DEPOSITO los de stock y ADMIN todos.

| Ruta | Consulta SQL | Devuelve |
|---|---|---|
| `GET /reportes/detalle-pedidos` (ventas) | INNER JOIN | `[{ "pedido_id", "fecha", "cliente", "zona", "vendedor", "producto", "cantidad", "subtotal" }]` |
| `GET /reportes/clientes-sobre-promedio` (ventas) | Subconsulta | `[{ "cliente_id", "razon_social", "total_comprado", "promedio_general" }]` |
| `GET /reportes/productos-sin-ventas?dias=30` (stock, `dias` de 1 a 365, sin filtro de fechas) | Subconsulta | `[{ "producto_id", "nombre", "presentacion", "stock" }]` |
| `GET /reportes/ventas-por-zona-categoria` (ventas) | GROUP BY | `[{ "zona", "categoria", "pedidos", "unidades", "total" }]` |
| `GET /reportes/ranking-productos?limite=10` (ventas, `limite` de 1 a 50) | GROUP BY | `[{ "producto_id", "nombre", "unidades", "total" }]` |
| `GET /reportes/stock-bajo` (stock, sin filtro de fechas) | Simple | `[{ "producto_id", "nombre", "stock", "stock_minimo", "proveedor" }]` |

## Dashboard

### `GET /dashboard`

Lo ven los tres roles. Acepta `?desde=&hasta=` igual que los reportes (por defecto, el mes actual). `ventas_mes`, `clientes_activos` y `ventas_por_dia` usan ese rango. `pedidos_pendientes` y `productos_bajo_minimo` muestran el estado de hoy.

```json
{ "ventas_mes": 4850000.00, "pedidos_pendientes": 7, "productos_bajo_minimo": 4, "clientes_activos": 12,
  "ventas_por_dia": [ { "fecha": "2026-11-01", "total": 320000.00 } ] }
```
