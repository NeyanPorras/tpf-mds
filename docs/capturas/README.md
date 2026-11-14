# Capturas de Swagger

Tomadas de http://localhost:8000/docs con la base recién creada. Se regeneran con `node scripts/capturas-swagger.cjs` desde `frontend/` (base y backend levantados).

| Captura | Qué muestra |
|---|---|
| [01-endpoints.png](01-endpoints.png) | Los 44 endpoints agrupados por recurso; el candado marca los que piden token |
| [02-login-jwt.png](02-login-jwt.png) | `POST /api/auth/login` devuelve el `access_token` (JWT), su vencimiento y el usuario |
| [03-authorize.png](03-authorize.png) | El botón **Authorize**: se pega el token y Swagger lo manda como `Authorization: Bearer` |
| [04-sin-token-401.png](04-sin-token-401.png) | Sin token, un endpoint protegido responde `401` |
| [05-rol-sin-permiso-403.png](05-rol-sin-permiso-403.png) | Con token de VENDEDOR, `GET /api/usuarios` (solo ADMIN) responde `403` |
| [06-confirmar-sin-stock-409.png](06-confirmar-sin-stock-409.png) | Confirmar el pedido 40: `sp_confirmar_pedido` hace ROLLBACK y la API responde `409 STOCK_INSUFICIENTE` con lo solicitado y lo disponible |
| [07-usuarios-admin-200.png](07-usuarios-admin-200.png) | Con token de ADMIN, el listado de usuarios: nunca incluye la contraseña ni su hash |
