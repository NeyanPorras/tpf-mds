-- =============================================================
-- Pruebas de las consultas de reportes (tarea D4)
-- Requiere la base creada (01_schema.sql en adelante).
-- Correr:
--   Get-Content database/tests/04_consultas_reportes.sql | docker exec -i tpf-mds-db mysql -uroot -proot --table distribuidora
--
-- Carga datos propios en enero de 2030 (prefijo D4TEST), lejos de
-- los datos de prueba de 2026, y ejecuta database/consultas/reportes.sql
-- sobre ese rango. Antes de cada resultado se muestra lo esperado,
-- calculado a mano:
--
--   Pedido  Cliente (zona)  Estado      Fecha              Lineas
--   A       Norte           ENTREGADO   2030-01-10         P1 x3 a $100
--   B       Sur             CONFIRMADO  2030-01-31 23:00   P1 x1 a $100, P2 x2 a $200
--   C       Centro          ENTREGADO   2030-01-20         P2 x1 a $200
--   D       Centro          PENDIENTE   2030-01-15         P1 x10   (no es venta)
--   E       Centro          CANCELADO   2030-01-15         P2 x10   (no es venta)
--   F       Centro          ENTREGADO   2030-02-01 00:00   P1 x5    (fuera del rango)
--
-- P3 nunca se vendio. P2 tiene stock 2 con minimo 5.
-- Al final se borran los datos de prueba.
-- =============================================================

-- -------------------------------------------------------------
-- Datos de prueba
-- -------------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol_id)
  VALUES ('D4TEST Vendedor', 'd4test@test.com', 'x', 2);
SET @u = LAST_INSERT_ID();
INSERT INTO categorias (nombre) VALUES ('D4TEST Categoria');
SET @cat = LAST_INSERT_ID();
INSERT INTO proveedores (razon_social, cuit) VALUES ('D4TEST Proveedor', '30-88888888-1');
SET @prov = LAST_INSERT_ID();

INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('D4TEST P1', 'x1', 100, 50, 5, @cat, @prov);
SET @p1 = LAST_INSERT_ID();
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('D4TEST P2', 'x1', 200, 2, 5, @cat, @prov);
SET @p2 = LAST_INSERT_ID();
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('D4TEST P3', 'x1', 300, 50, 5, @cat, @prov);
SET @p3 = LAST_INSERT_ID();

INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('D4TEST Norte', '20-88888888-1', 'Calle 1', 'Norte');
SET @cn = LAST_INSERT_ID();
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('D4TEST Sur', '20-88888888-2', 'Calle 2', 'Sur');
SET @cs = LAST_INSERT_ID();
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('D4TEST Centro', '20-88888888-3', 'Calle 3', 'Centro');
SET @cc = LAST_INSERT_ID();

-- Los pedidos se cargan con su estado y total ya calculados: estas
-- pruebas miden las consultas, no el procedimiento (eso es D3).
INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cn, @u, '2030-01-10 10:00:00', 'ENTREGADO', 300);
SET @pa = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pa, @p1, 3, 100);

INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cs, @u, '2030-01-31 23:00:00', 'CONFIRMADO', 500);
SET @pb = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pb, @p1, 1, 100), (@pb, @p2, 2, 200);

INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cc, @u, '2030-01-20 10:00:00', 'ENTREGADO', 200);
SET @pc = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pc, @p2, 1, 200);

INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cc, @u, '2030-01-15 10:00:00', 'PENDIENTE', 0);
SET @pd = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pd, @p1, 10, 100);

INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cc, @u, '2030-01-15 11:00:00', 'CANCELADO', 0);
SET @pe = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pe, @p2, 10, 200);

INSERT INTO pedidos (cliente_id, usuario_id, fecha, estado, total)
  VALUES (@cc, @u, '2030-02-01 00:00:00', 'ENTREGADO', 500);
SET @pf = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@pf, @p1, 5, 100);

-- -------------------------------------------------------------
-- Lo esperado, en el mismo orden en que salen las consultas
-- -------------------------------------------------------------
SET @desde = '2030-01-01';
SET @hasta = '2030-01-31';
SET @dias  = 30;

SELECT '1. INNER JOIN: 4 lineas (A P1 3 $300; B P1 1 $100; B P2 2 $400; C P2 1 $200). Sin D, E ni F' AS esperado
UNION ALL SELECT '2a. Subconsulta: solo D4TEST Sur, 500.00, promedio 333.33 (300+500+200)/3'
UNION ALL SELECT '2b. Sin ventas: aparece D4TEST P3; NO aparecen D4TEST P1 ni P2'
UNION ALL SELECT '3a. GROUP BY: Centro 1 pedido 1 u $200; Norte 1 pedido 3 u $300; Sur 1 pedido 3 u $500'
UNION ALL SELECT '3b. Ranking: D4TEST P1 4 u $400, despues D4TEST P2 3 u $600'
UNION ALL SELECT '4. Stock bajo: aparece D4TEST P2 (2 de 5); NO aparecen P1 ni P3';

-- 2b y 4 no filtran por el rango: tambien muestran productos de 2026.
source /docker-entrypoint-initdb.d/consultas/reportes.sql

-- -------------------------------------------------------------
-- Limpieza
-- -------------------------------------------------------------
DELETE FROM pedidos WHERE id IN (@pa, @pb, @pc, @pd, @pe, @pf);
DELETE FROM clientes WHERE id IN (@cn, @cs, @cc);
DELETE FROM productos WHERE id IN (@p1, @p2, @p3);
DELETE FROM proveedores WHERE id = @prov;
DELETE FROM categorias WHERE id = @cat;
DELETE FROM usuarios WHERE id = @u;
SELECT COUNT(*) AS restos_de_prueba, 0 AS esperado
  FROM clientes WHERE razon_social LIKE 'D4TEST%';
