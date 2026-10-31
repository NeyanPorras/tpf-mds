-- =============================================================
-- Distribuidora de bebidas - Pedidos de prueba (agosto a octubre 2026)
-- Corre despues de 03_procedures.sql: los pedidos se confirman con
-- sp_confirmar_pedido, asi el stock, los movimientos y los totales
-- quedan coherentes. Archivo generado; no editar a mano los ids.
-- =============================================================
USE distribuidora;

-- Precio de venta = precio actual del producto (se copia en cada linea).

-- Pedido 1 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (1, 1, 2, '2026-08-01 17:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 1, id, CASE id WHEN 10 THEN 11 WHEN 15 THEN 12 WHEN 5 THEN 12 END, precio
    FROM productos WHERE id IN (10, 15, 5);
CALL sp_confirmar_pedido(1, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 1;

-- Pedido 2 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (2, 14, 2, '2026-08-02 16:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 2, id, CASE id WHEN 12 THEN 2 WHEN 15 THEN 7 WHEN 14 THEN 10 END, precio
    FROM productos WHERE id IN (12, 15, 14);
CALL sp_confirmar_pedido(2, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 2;

-- Pedido 3 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (3, 7, 2, '2026-08-10 17:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 3, id, CASE id WHEN 14 THEN 9 END, precio
    FROM productos WHERE id IN (14);
CALL sp_confirmar_pedido(3, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 3;

-- Pedido 4 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (4, 13, 2, '2026-08-11 08:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 4, id, CASE id WHEN 28 THEN 8 WHEN 14 THEN 9 WHEN 19 THEN 9 END, precio
    FROM productos WHERE id IN (28, 14, 19);
CALL sp_confirmar_pedido(4, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 4;

-- Pedido 5 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (5, 12, 2, '2026-08-12 18:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 5, id, CASE id WHEN 27 THEN 12 WHEN 2 THEN 9 END, precio
    FROM productos WHERE id IN (27, 2);
CALL sp_confirmar_pedido(5, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 5;

-- Pedido 6 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (6, 12, 2, '2026-08-13 18:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 6, id, CASE id WHEN 16 THEN 2 WHEN 5 THEN 11 WHEN 29 THEN 12 WHEN 8 THEN 8 END, precio
    FROM productos WHERE id IN (16, 5, 29, 8);
CALL sp_confirmar_pedido(6, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 6;

-- Pedido 7 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (7, 13, 2, '2026-08-14 16:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 7, id, CASE id WHEN 18 THEN 5 WHEN 13 THEN 9 WHEN 22 THEN 11 END, precio
    FROM productos WHERE id IN (18, 13, 22);
CALL sp_confirmar_pedido(7, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 7;

-- Pedido 8 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (8, 13, 2, '2026-08-15 18:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 8, id, CASE id WHEN 14 THEN 5 WHEN 7 THEN 1 WHEN 10 THEN 1 WHEN 27 THEN 3 END, precio
    FROM productos WHERE id IN (14, 7, 10, 27);
CALL sp_confirmar_pedido(8, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 8;

-- Pedido 9 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (9, 9, 2, '2026-08-16 15:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 9, id, CASE id WHEN 12 THEN 12 WHEN 30 THEN 8 WHEN 7 THEN 8 WHEN 9 THEN 9 END, precio
    FROM productos WHERE id IN (12, 30, 7, 9);
CALL sp_confirmar_pedido(9, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 9;

-- Pedido 10 · CANCELADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (10, 15, 2, '2026-08-27 13:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 10, id, CASE id WHEN 27 THEN 5 END, precio
    FROM productos WHERE id IN (27);
UPDATE pedidos SET estado = 'CANCELADO' WHERE id = 10;

-- Pedido 11 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (11, 8, 2, '2026-08-29 16:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 11, id, CASE id WHEN 15 THEN 12 END, precio
    FROM productos WHERE id IN (15);
CALL sp_confirmar_pedido(11, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 11;

-- Pedido 12 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (12, 15, 2, '2026-08-31 09:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 12, id, CASE id WHEN 14 THEN 12 WHEN 27 THEN 8 END, precio
    FROM productos WHERE id IN (14, 27);
CALL sp_confirmar_pedido(12, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 12;

-- Pedido 13 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (13, 8, 2, '2026-09-02 09:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 13, id, CASE id WHEN 12 THEN 7 WHEN 4 THEN 3 WHEN 7 THEN 8 WHEN 24 THEN 1 END, precio
    FROM productos WHERE id IN (12, 4, 7, 24);
CALL sp_confirmar_pedido(13, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 13;

-- Pedido 14 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (14, 10, 2, '2026-09-06 11:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 14, id, CASE id WHEN 20 THEN 4 END, precio
    FROM productos WHERE id IN (20);
CALL sp_confirmar_pedido(14, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 14;

-- Pedido 15 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (15, 3, 2, '2026-09-10 12:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 15, id, CASE id WHEN 25 THEN 9 END, precio
    FROM productos WHERE id IN (25);
CALL sp_confirmar_pedido(15, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 15;

-- Pedido 16 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (16, 12, 2, '2026-09-10 17:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 16, id, CASE id WHEN 11 THEN 11 END, precio
    FROM productos WHERE id IN (11);
CALL sp_confirmar_pedido(16, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 16;

-- Pedido 17 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (17, 2, 2, '2026-09-13 10:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 17, id, CASE id WHEN 18 THEN 8 WHEN 8 THEN 10 END, precio
    FROM productos WHERE id IN (18, 8);
CALL sp_confirmar_pedido(17, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 17;

-- Pedido 18 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (18, 9, 2, '2026-09-14 14:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 18, id, CASE id WHEN 22 THEN 10 WHEN 6 THEN 5 WHEN 30 THEN 9 WHEN 5 THEN 7 END, precio
    FROM productos WHERE id IN (22, 6, 30, 5);
CALL sp_confirmar_pedido(18, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 18;

-- Pedido 19 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (19, 14, 2, '2026-09-15 09:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 19, id, CASE id WHEN 13 THEN 2 WHEN 1 THEN 7 END, precio
    FROM productos WHERE id IN (13, 1);
CALL sp_confirmar_pedido(19, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 19;

-- Pedido 20 · CANCELADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (20, 11, 2, '2026-09-18 15:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 20, id, CASE id WHEN 21 THEN 1 WHEN 12 THEN 1 WHEN 30 THEN 9 END, precio
    FROM productos WHERE id IN (21, 12, 30);
UPDATE pedidos SET estado = 'CANCELADO' WHERE id = 20;

-- Pedido 21 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (21, 3, 2, '2026-09-20 17:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 21, id, CASE id WHEN 15 THEN 2 WHEN 11 THEN 8 WHEN 30 THEN 8 END, precio
    FROM productos WHERE id IN (15, 11, 30);
CALL sp_confirmar_pedido(21, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 21;

-- Pedido 22 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (22, 11, 2, '2026-09-23 17:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 22, id, CASE id WHEN 14 THEN 6 WHEN 20 THEN 8 END, precio
    FROM productos WHERE id IN (14, 20);
CALL sp_confirmar_pedido(22, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 22;

-- Pedido 23 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (23, 11, 2, '2026-09-26 08:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 23, id, CASE id WHEN 18 THEN 7 END, precio
    FROM productos WHERE id IN (18);
CALL sp_confirmar_pedido(23, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 23;

-- Pedido 24 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (24, 8, 2, '2026-09-27 15:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 24, id, CASE id WHEN 2 THEN 9 WHEN 21 THEN 1 END, precio
    FROM productos WHERE id IN (2, 21);
CALL sp_confirmar_pedido(24, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 24;

-- Pedido 25 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (25, 13, 2, '2026-10-02 16:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 25, id, CASE id WHEN 5 THEN 11 END, precio
    FROM productos WHERE id IN (5);
CALL sp_confirmar_pedido(25, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 25;

-- Pedido 26 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (26, 9, 2, '2026-10-02 12:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 26, id, CASE id WHEN 6 THEN 3 WHEN 23 THEN 7 END, precio
    FROM productos WHERE id IN (6, 23);
CALL sp_confirmar_pedido(26, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 26;

-- Pedido 27 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (27, 5, 2, '2026-10-04 15:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 27, id, CASE id WHEN 3 THEN 6 WHEN 13 THEN 3 WHEN 10 THEN 5 WHEN 6 THEN 8 END, precio
    FROM productos WHERE id IN (3, 13, 10, 6);
CALL sp_confirmar_pedido(27, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 27;

-- Pedido 28 · CANCELADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (28, 14, 2, '2026-10-05 12:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 28, id, CASE id WHEN 6 THEN 8 WHEN 11 THEN 2 WHEN 17 THEN 9 WHEN 16 THEN 9 END, precio
    FROM productos WHERE id IN (6, 11, 17, 16);
UPDATE pedidos SET estado = 'CANCELADO' WHERE id = 28;

-- Pedido 29 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (29, 7, 2, '2026-10-05 18:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 29, id, CASE id WHEN 8 THEN 2 WHEN 1 THEN 8 END, precio
    FROM productos WHERE id IN (8, 1);
CALL sp_confirmar_pedido(29, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 29;

-- Pedido 30 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (30, 2, 2, '2026-10-10 16:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 30, id, CASE id WHEN 1 THEN 3 WHEN 12 THEN 6 END, precio
    FROM productos WHERE id IN (1, 12);
CALL sp_confirmar_pedido(30, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 30;

-- Pedido 31 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (31, 11, 2, '2026-10-11 12:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 31, id, CASE id WHEN 18 THEN 12 WHEN 27 THEN 4 WHEN 19 THEN 10 END, precio
    FROM productos WHERE id IN (18, 27, 19);
CALL sp_confirmar_pedido(31, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 31;

-- Pedido 32 · ENTREGADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (32, 2, 2, '2026-10-13 14:15:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 32, id, CASE id WHEN 4 THEN 5 WHEN 28 THEN 2 END, precio
    FROM productos WHERE id IN (4, 28);
CALL sp_confirmar_pedido(32, 2);
UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = 32;

-- Pedido 33 · CONFIRMADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (33, 9, 2, '2026-10-15 10:00:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 33, id, CASE id WHEN 27 THEN 6 END, precio
    FROM productos WHERE id IN (27);
CALL sp_confirmar_pedido(33, 2);

-- Pedido 34 · CONFIRMADO
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (34, 5, 2, '2026-10-16 10:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 34, id, CASE id WHEN 9 THEN 2 WHEN 19 THEN 5 WHEN 29 THEN 6 END, precio
    FROM productos WHERE id IN (9, 19, 29);
CALL sp_confirmar_pedido(34, 2);

-- Pedido 35 · PENDIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (35, 1, 2, '2026-10-18 12:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 35, id, CASE id WHEN 1 THEN 7 END, precio
    FROM productos WHERE id IN (1);

-- Pedido 36 · PENDIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (36, 2, 2, '2026-10-19 08:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 36, id, CASE id WHEN 4 THEN 4 END, precio
    FROM productos WHERE id IN (4);

-- Pedido 37 · PENDIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (37, 6, 2, '2026-10-21 17:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 37, id, CASE id WHEN 23 THEN 9 END, precio
    FROM productos WHERE id IN (23);

-- Pedido 38 · PENDIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (38, 7, 2, '2026-10-22 17:45:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 38, id, CASE id WHEN 21 THEN 7 WHEN 22 THEN 6 WHEN 24 THEN 10 WHEN 2 THEN 4 END, precio
    FROM productos WHERE id IN (21, 22, 24, 2);

-- Pedido 39 · PENDIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (39, 7, 2, '2026-10-26 16:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 39, id, CASE id WHEN 23 THEN 6 END, precio
    FROM productos WHERE id IN (23);

-- Pedido 40 · PENDIENTE · pide mas Quilmes en lata de la que hay: confirmarlo falla con STOCK_INSUFICIENTE
INSERT INTO pedidos (id, cliente_id, usuario_id, fecha) VALUES (40, 12, 2, '2026-10-27 08:30:00');
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  SELECT 40, id, CASE id WHEN 2 THEN 3 WHEN 13 THEN 26 END, precio
    FROM productos WHERE id IN (2, 13);

-- Los movimientos de cada pedido llevan la fecha del pedido (el procedimiento usa NOW()).
UPDATE movimientos_stock m JOIN pedidos p ON p.id = m.pedido_id SET m.fecha = p.fecha;
