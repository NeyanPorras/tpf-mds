# Decisiones del grupo

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-28 | Rubro: distribuidora de bebidas | Suma clientes y pedidos al stock, y eso da un procedimiento almacenado claro |
| 2026-10-28 | Repo centralizado en GitHub con ramas por tarea y Pull Requests | El modelo de integración deja a una sola persona como cuello de botella; con PR, las reuniones se dedican a revisar código |
| 2026-10-28 | El pedido se crea PENDIENTE y se confirma con `sp_confirmar_pedido` | Los procedimientos de MySQL no reciben listas cómodamente; así la transacción cubre solo la parte crítica |
| 2026-10-28 | `detalle_pedido.precio_unitario` copia el precio al vender | Los pedidos viejos deben mostrar lo que se cobró aunque el precio cambie |
