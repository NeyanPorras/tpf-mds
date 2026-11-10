# Decisiones del grupo

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-28 | Rubro: distribuidora de bebidas | Suma clientes y pedidos al stock, y eso da un procedimiento almacenado claro |
| 2026-10-28 | Repo centralizado en GitHub con ramas por tarea y Pull Requests | El modelo de integración deja a una sola persona como cuello de botella; con PR, las reuniones se dedican a revisar código |
| 2026-10-28 | El pedido se crea PENDIENTE y se confirma con `sp_confirmar_pedido` | Los procedimientos de MySQL no reciben listas cómodamente; así la transacción cubre solo la parte crítica |
| 2026-10-28 | `detalle_pedido.precio_unitario` copia el precio al vender | Los pedidos viejos deben mostrar lo que se cobró aunque el precio cambie |
| 2026-10-28 | MySQL corre en Docker (`docker compose`); backend y frontend corren directo en la máquina | Todos tienen la misma base y la misma contraseña, se recrea con un comando y evita problemas con MySQL instalado en Windows. Backend y frontend quedan fuera de Docker porque la recarga automática y la depuración andan peor dentro de contenedores en Windows |
| 2026-10-29 | Frontend en JavaScript (`.jsx`), sin TypeScript | El enunciado pide "React – JavaScript" y el profesor es estricto con el stack; convertirlo después de F1 era barato, más adelante no |
| 2026-11-09 | Arquitectura MVC en capas: `routers/` como Controller, `repositories/` + `schemas/` + MySQL como Model, React como View, y `services/` como capa de servicio | El enunciado pide MVC. Con una API REST, la View no la genera el servidor: el backend devuelve JSON y React dibuja. La capa de servicio evita que la lógica de negocio quede en los controllers. Se mantuvieron los nombres de carpetas que ya usaba el código en lugar de renombrarlas a `models/` y `controllers/` |
