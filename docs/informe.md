# Informe: requisitos del enunciado y dónde se cumplen

Trabajo práctico final de Metodología de Sistemas II: aplicación web para una **distribuidora de bebidas** (temática "Sistema de gestión de inventarios y stock", con clientes, pedidos y reportes). Stack: MySQL 8, FastAPI y React con JavaScript.

Este documento recorre cada requisito del enunciado y señala el archivo o la pantalla donde se puede verificar. Cómo levantar el proyecto está en el [README](../README.md).

## A. Base de datos (MySQL)

| Requisito | Cómo se cumple | Dónde verlo |
|---|---|---|
| Mínimo 4 tablas normalizadas, con PK y FK | 9 tablas: `roles`, `usuarios`, `categorias`, `proveedores`, `productos`, `clientes`, `pedidos`, `detalle_pedido` y `movimientos_stock`, en 3FN. La normalización está justificada tabla por tabla, incluida la excepción a propósito del precio congelado en `detalle_pedido` | [database/01_schema.sql](../database/01_schema.sql), [docs/modelo-er.md](modelo-er.md#normalización) |
| Al menos 1 procedimiento almacenado con parámetros, COMMIT y ROLLBACK | `sp_confirmar_pedido(p_pedido_id, p_usuario_id)`: bloquea pedido y productos (`FOR UPDATE`), verifica stock, descuenta, registra movimientos y confirma con `COMMIT`. Si falta stock hace `ROLLBACK` y avisa con `SIGNAL`; un `EXIT HANDLER` hace `ROLLBACK` ante cualquier error | [database/03_procedures.sql](../database/03_procedures.sql), pruebas en [database/tests/03_sp_confirmar_pedido.sql](../database/tests/03_sp_confirmar_pedido.sql) |
| Modelo E/R | Diagrama con las 9 entidades y sus relaciones (Mermaid, se ve dibujado en GitHub) | [docs/modelo-er.md](modelo-er.md) |
| Integridad referencial con constraints | FK con `ON DELETE RESTRICT` (y `CASCADE` solo en las líneas de un pedido), `UNIQUE` (email, CUIT, producto por pedido), `CHECK` (stock nunca negativo, precio y cantidades positivas, formato de CUIT) y `ENUM` para estados y zonas | [docs/modelo-er.md](modelo-er.md#restricciones-que-hay-que-mostrar-en-la-defensa), pruebas en [database/tests/01_schema_checks.sql](../database/tests/01_schema_checks.sql) |

**Para la demo:** el pedido 40 de los datos de prueba no se puede confirmar por falta de stock. Al intentarlo, la pantalla muestra qué producto falta y cuánto, y el stock queda intacto: es el `ROLLBACK` en vivo.

## B. Backend (FastAPI)

| Requisito | Cómo se cumple | Dónde verlo |
|---|---|---|
| REST API con FastAPI | 44 endpoints bajo `/api`, documentados en Swagger | http://localhost:8000/docs, [docs/capturas/](capturas/), [docs/contrato-api.md](contrato-api.md) |
| CRUD de las entidades principales | Usuarios, categorías, proveedores, productos y clientes con alta, lectura, modificación y baja. Pedidos con alta, edición de líneas y cambios de estado (confirmar, cancelar, entregar) | [backend/app/routers/](../backend/app/routers/) |
| 3 consultas con INNER JOIN, subconsultas y GROUP BY | **INNER JOIN:** detalle de pedidos (pedido, cliente, vendedor y producto). **Subconsulta:** clientes que compraron más que el promedio, y productos sin ventas en los últimos N días. **GROUP BY:** ventas por zona y categoría, ranking de productos y el dashboard | [backend/app/repositories/reportes.py](../backend/app/repositories/reportes.py), las mismas consultas en SQL puro en [database/consultas/reportes.sql](../database/consultas/reportes.sql) |
| Conexión asíncrona con MySQL | Pool de `aiomysql` creado al iniciar la app; cada request toma una conexión con `async with` y todas las consultas usan `await` | [backend/app/core/database.py](../backend/app/core/database.py) |
| **(Obligatorio)** Seguridad y control de acceso con JWT | Ver la sección siguiente | [backend/app/core/seguridad.py](../backend/app/core/seguridad.py) |

### Flujo de autenticación JWT

1. `POST /api/auth/login` recibe email y contraseña. La contraseña se compara contra un hash **bcrypt**; nunca se guarda en texto plano. Si falla el email, la contraseña o el usuario está inactivo, el mensaje es el mismo, para no revelar qué cuentas existen.
2. El backend firma un token **HS256** con el id del usuario, su rol y un vencimiento (`exp`, 60 minutos por defecto).
3. El frontend lo manda en cada request como `Authorization: Bearer <token>` (interceptor de axios en [frontend/src/api/cliente.js](../frontend/src/api/cliente.js)).
4. En el backend, la dependencia `get_current_user` valida firma y vencimiento y **vuelve a leer el usuario de la base**. Por eso, si el ADMIN desactiva un usuario, su token deja de valer en el request siguiente, y si le cambia el rol, el permiso nuevo aplica sin volver a loguearse.
5. `require_role("ADMIN", ...)` protege cada endpoint según la tabla de permisos: sin token responde `401` y con un rol sin permiso, `403`.
6. Si la API responde `401` (token vencido o usuario desactivado), el frontend borra la sesión y vuelve al login.

| Rol | Puede |
|---|---|
| ADMIN | Todo, incluida la gestión de usuarios |
| VENDEDOR | Clientes, pedidos (crear, confirmar, cancelar) y reportes de ventas |
| DEPOSITO | Ingreso de mercadería, marcar pedidos entregados y reportes de stock |

## C. Frontend (React con JavaScript)

| Requisito | Cómo se cumple | Dónde verlo |
|---|---|---|
| App React que consume la API REST | Vite + React 19 en JavaScript; un cliente axios con la URL de la API y el token | [frontend/src/api/cliente.js](../frontend/src/api/cliente.js) |
| Formularios con validación para alta, modificación y baja | Componente `Formulario` reutilizable: valida obligatorios, longitudes, rangos y formatos antes de enviar, y muestra campo por campo los errores `422` del backend. Se usa en categorías, proveedores, productos, clientes y usuarios | [frontend/src/components/Formulario.jsx](../frontend/src/components/Formulario.jsx), pantallas en [frontend/src/pages/](../frontend/src/pages/) |
| Tablas o dashboards | Tablas paginadas con filtros en todos los ABM y en pedidos. Dashboard de inicio con ventas del período, clientes activos, pedidos pendientes, stock bajo y gráfico de ventas por día | Pantalla **Inicio**, [frontend/src/components/Tabla.jsx](../frontend/src/components/Tabla.jsx) |
| Reportes con exportación a PDF o Excel | Pantalla **Reportes**: elegir reporte y filtros, ver la tabla y exportarla a **PDF** (jsPDF) o **Excel** (ExcelJS) con los filtros aplicados en el encabezado | [frontend/src/pages/Reportes.jsx](../frontend/src/pages/Reportes.jsx), [frontend/src/reportes/exportar.js](../frontend/src/reportes/exportar.js) |

## Requisitos adicionales

| Requisito | Cómo se cumple |
|---|---|
| Validación cruzada (cliente y servidor) | El mismo dato se valida tres veces. **Frontend:** el `Formulario` y los filtros de reportes, antes de enviar. **Backend:** esquemas Pydantic ([backend/app/schemas/](../backend/app/schemas/)) que responden `422` con el campo que falló. **Base:** `CHECK`, `UNIQUE` y FK como última barrera. Ejemplo: un CUIT con formato inválido lo frenan las tres capas |
| Arquitectura en capas (MVC) | **Controller:** `routers/` (HTTP y permisos). **Servicio:** `services/` (reglas de negocio). **Model:** `repositories/` (el único lugar con SQL), `schemas/` y MySQL. **View:** React. Flujo: `React → router → service → repository → MySQL`. Detalle en el [README](../README.md#arquitectura-mvc-en-capas) |

## Integración end-to-end y pruebas

| Nivel | Qué prueba | Cantidad |
|---|---|---|
| Base | Restricciones del esquema, COMMIT y ROLLBACK del procedimiento, y las consultas de reportes contra datos conocidos | 3 scripts en [database/tests/](../database/tests/) |
| Backend | Permisos por rol, validaciones, reglas de negocio y, contra MySQL real, la confirmación con falta de stock y el ciclo completo de un usuario con su token | 94 tests (`pytest`) |
| Frontend | Validación de filtros, formato de fechas y moneda, respuestas viejas descartadas y armado de datos de usuarios | 46 tests (`npm test`) |
| End-to-end | Navegador real contra base, backend y frontend: menú y rutas por rol, ABM, pedidos con falta de stock, dashboard, reportes y usuarios | 69 tests (Playwright) |

## Librerías externas

El enunciado permite librerías externas y pide priorizar el código propio. Usamos solo las necesarias:

- **Backend:** FastAPI y uvicorn (servidor), aiomysql (conexión asíncrona), Pydantic (validación), PyJWT (tokens) y bcrypt (contraseñas).
- **Frontend:** React y react-router-dom, axios (HTTP), y jsPDF, jspdf-autotable y ExcelJS para exportar.

Todo lo demás es propio: las consultas SQL a mano (sin ORM), el procedimiento almacenado, la tabla, el modal y el formulario con validación, el gráfico del dashboard en SVG y el control de acceso por rol.
