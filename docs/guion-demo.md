# Guion de la demo

Duración: **14 minutos** (el límite es 15). La historia: un pedido que confirma bien, otro que falla por falta de stock y se revierte, el depósito repone y el mismo pedido se confirma.

Todos los números de este guion salen de la base recién creada. Si se hizo un ensayo o se corrieron tests antes, **recrear la base**: si no, el pedido nuevo no es el #41 y los stocks no coinciden.

## Antes de empezar (10 minutos antes)

1. Abrir Docker Desktop y esperar a que el motor esté corriendo (no alcanza con la ventana abierta).
2. Recrear la base:

   ```bash
   docker compose down -v
   docker compose up -d
   ```

3. Levantar el backend y el frontend, cada uno en su terminal (ver el [README](../README.md#cómo-levantar-el-proyecto)). Si el backend ya estaba corriendo, reiniciarlo: no se reconecta solo a una base nueva.
4. Verificar http://localhost:8000/api/health: tiene que decir `"base_de_datos":"conectada"`.
5. Dejar abiertas tres pestañas: http://localhost:5173, http://localhost:8000/docs y [database/03_procedures.sql](../database/03_procedures.sql) en el editor.
6. Zoom del navegador al 125 % para que se lea en el proyector.

## Resumen

| # | Bloque | Quién | Tiempo | Qué se demuestra |
|---|---|---|---|---|
| 1 | Presentación y arquitectura | P2 | 1:00 | Stack y capas MVC |
| 2 | ADMIN: menú y dashboard | P4 | 1:30 | Roles, dashboard con datos reales |
| 3 | VENDEDOR: pedido que confirma | P3 | 3:00 | Permisos por rol, alta de pedido, `COMMIT` |
| 4 | VENDEDOR: pedido sin stock | P1 | 2:30 | `ROLLBACK` en vivo |
| 5 | DEPOSITO: reponer y entregar | P3 | 1:30 | Ingreso de mercadería, entrega |
| 6 | ADMIN: confirmar y reportes | P1 | 2:30 | El pedido ahora confirma; exportar PDF y Excel |
| 7 | Swagger y JWT | P2 | 1:30 | Login, token, `401` y `403` |
| 8 | Cierre | P4 | 0:30 | |
| | | | **14:00** | |

Los responsables son una sugerencia según el rol de cada uno en el tablero; el grupo los puede cambiar.

## 1. Presentación y arquitectura (1:00)

- Distribuidora de bebidas: stock, clientes, pedidos y reportes. MySQL 8, FastAPI y React en JavaScript.
- Flujo de una petición: `React → router → service → repository → MySQL`. Los `routers` son el controller, `repositories` es el único lugar con SQL y React es la vista.
- Tres roles: ADMIN, VENDEDOR y DEPOSITO. Cada uno ve y puede hacer solo lo suyo.

## 2. ADMIN: menú y dashboard (1:30)

1. Ingresar con `admin@distribuidora.com` / `Admin123!`.
2. Mostrar el menú: 8 secciones, incluida **Usuarios**, que solo ve el ADMIN.
3. En el resumen de Inicio, tocar **Ago a oct 2026** (los datos de prueba son de esos meses). Se ve:
   - Ventas del período: **$ 14.269.200,00**
   - Clientes activos: **13**
   - Pedidos pendientes: **6**
   - Stock bajo: **5**
   - El gráfico de ventas por día.
4. Decir: los indicadores salen de consultas con `GROUP BY` sobre los pedidos confirmados y entregados.
5. Tocar **Salir**.

## 3. VENDEDOR: pedido que confirma (3:00)

1. Ingresar con `ventas@distribuidora.com` / `Venta123!`.
2. Mostrar el menú: 7 secciones, sin Usuarios.
3. Escribir a mano `http://localhost:5173/usuarios` en la barra: vuelve al inicio. Decir: aunque se saltee el frontend, la API responde `403` (se muestra en el bloque 7).
4. Ir a **Productos**, buscar `Coca-Cola` y mostrar la **Coca-Cola 2.25L x6**: stock **11**.
5. Ir a **Pedidos** → **Nuevo pedido**:
   - Cliente: **Almacén Don Pepe (Centro)**.
   - Producto: **Coca-Cola 2.25L x6**, cantidad **2**, **Agregar**.
   - **Crear pedido**. Aparece: *"Pedido #41 creado en estado PENDIENTE."*
6. En la fila del #41, **Confirmar**. Aparece: *"Pedido #41 confirmado. Total: $ 37.000,00."*
7. Volver a **Productos**: la Coca-Cola 2.25L x6 bajó a **9**. Decir: el procedimiento descontó el stock, registró el movimiento y hizo `COMMIT`.

## 4. VENDEDOR: pedido sin stock, el ROLLBACK (2:30)

Este es el momento central de la demo.

1. En **Productos**, mostrar la **Cerveza Quilmes Clásica 473ml lata x24**: stock **6** (en rojo, bajo el mínimo de 10).
2. Ir a **Pedidos**, filtrar por **PENDIENTE** y en la fila del **#40** tocar **Confirmar**.
3. Aparece el aviso:
   - *"Falta de stock: no se pudo confirmar el pedido #40"*
   - Producto: Cerveza Quilmes Clásica 473ml lata x24. Solicitado **26**, disponible **6**, faltan **20**.
   - *"La confirmación no descontó stock: la operación se revirtió completa."*
4. Cerrar el aviso y volver a **Productos**: la Quilmes sigue en **6**, y la Coca-Cola Zero del mismo pedido tampoco cambió.
5. Mostrar [database/03_procedures.sql](../database/03_procedures.sql) en el editor, `sp_confirmar_pedido`:
   - `START TRANSACTION` y `SELECT ... FOR UPDATE` bloquean el pedido y sus productos.
   - Si falta stock: `ROLLBACK` y `SIGNAL` con el nombre del producto. El backend lo traduce a `409 STOCK_INSUFICIENTE`.
   - Si todo está bien: descuenta, registra los movimientos y `COMMIT`.
   - Un `EXIT HANDLER` hace `ROLLBACK` ante cualquier otro error.
6. Tocar **Salir**.

## 5. DEPOSITO: reponer y entregar (1:30)

1. Ingresar con `deposito@distribuidora.com` / `Deposito123!`.
2. Mostrar el menú: 6 secciones, sin Clientes ni Usuarios.
3. En **Productos**, buscar `Quilmes` y en la de 473ml tocar **+ Ingreso**, cantidad **20**, **Confirmar ingreso**. Aparece: *"Ingreso registrado: se sumaron 20 unidades a "Cerveza Quilmes Clásica"."* El stock pasa a **26**.
4. Ir a **Pedidos**, filtrar por **CONFIRMADO** y en el **#41** tocar **Entregar**. Aparece: *"Pedido #41 marcado como ENTREGADO."*
5. Decir: el depósito no puede crear ni confirmar pedidos; solo ve el botón **Entregar**.
6. Tocar **Salir**.

## 6. ADMIN: confirmar y reportes (2:30)

1. Ingresar como ADMIN.
2. **Pedidos** → filtro **PENDIENTE** → **#40** → **Confirmar**. Ahora confirma: *"Pedido #40 confirmado. Total: $ 1.053.900,00."* La Quilmes queda en **0**.
3. Ir a **Reportes**, elegir **Ventas por zona y categoría**, cambiar el rango (por defecto es el mes actual) al 01/08/2026 – 31/10/2026, **Consultar**.
4. **Exportar PDF** y abrir el archivo: lleva el nombre del reporte y los filtros en el encabezado.
5. **Exportar Excel** y abrirlo.
6. Mencionar los otros reportes: detalle de pedidos (`INNER JOIN`), clientes sobre el promedio (subconsulta), productos sin ventas y stock bajo.

## 7. Swagger y JWT (1:30)

En la pestaña http://localhost:8000/docs:

1. Mostrar la lista de endpoints; los que tienen candado piden token.
2. `GET /api/usuarios` → **Try it out** → **Execute** sin token: `401`.
3. `POST /api/auth/login` con el VENDEDOR: devuelve el `access_token`.
4. **Authorize**, pegar el token, y repetir `GET /api/usuarios`: `403`, porque es solo para ADMIN.
5. Decir: el token es HS256 y vence en 60 minutos. Las contraseñas se guardan con bcrypt. En cada request el backend vuelve a leer el usuario, así que desactivarlo o cambiarle el rol aplica sin esperar a que venza el token.

## 8. Cierre (0:30)

- El código y la documentación están en el repositorio. En [docs/informe.md](informe.md) cada requisito del enunciado tiene el archivo donde se cumple.
- Pruebas: 94 del backend, 46 unitarias del frontend y 69 end-to-end con Playwright.

## Si algo falla

| Problema | Qué hacer |
|---|---|
| `/api/health` responde `503` | Docker no está corriendo o el backend arrancó antes que la base. Abrir Docker Desktop, esperar y reiniciar el backend. |
| El pedido nuevo no es el #41 o los stocks no coinciden | La base no está recién creada. Si no hay tiempo, seguir igual: la historia es la misma con otros números. |
| Se confirmó el #40 antes de tiempo | Recrear la base, o seguir con otro pedido que pida más stock del que hay. |
| No anda Swagger en vivo | Mostrar las capturas de [docs/capturas/](capturas/). |

## Preguntas probables

- **¿Por qué los usuarios no se borran?** Porque los pedidos los referencian con `ON DELETE RESTRICT`; se desactivan (`activo = false`) y pierden el acceso en el request siguiente.
- **¿Por qué `detalle_pedido` guarda el precio si ya está en `productos`?** Para congelar el precio del momento de la venta. Es la única excepción a 3FN, justificada en [docs/modelo-er.md](modelo-er.md).
- **¿Dónde está el SQL?** Solo en `backend/app/repositories/`, escrito a mano y sin ORM. Las consultas de reportes también están en [database/consultas/reportes.sql](../database/consultas/reportes.sql).
- **¿Qué pasa si dos vendedores confirman a la vez?** `FOR UPDATE` bloquea las filas de los productos: el segundo espera y después ve el stock ya descontado.
