-- =============================================================
-- Pruebas de sp_confirmar_pedido (tarea D3)
-- Requiere 01_schema.sql y 03_procedures.sql cargados.
-- Correr con --force para que siga despues de cada error esperado:
--   Get-Content database/tests/03_sp_confirmar_pedido.sql | docker exec -i tpf-mds-db mysql -uroot -proot --force distribuidora
-- Cada prueba muestra el valor "esperado" al lado del valor obtenido.
-- Como el procedimiento hace COMMIT, al final se borran los datos de prueba.
-- =============================================================

-- -------------------------------------------------------------
-- Datos de prueba (nombres con prefijo SPTEST para borrarlos al final)
-- -------------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol_id)
  VALUES ('SPTEST Vendedor', 'sptest@test.com', 'x', 2);
SET @u = LAST_INSERT_ID();
INSERT INTO categorias (nombre) VALUES ('SPTEST Gaseosas');
SET @cat = LAST_INSERT_ID();
INSERT INTO proveedores (razon_social, cuit) VALUES ('SPTEST Proveedor', '30-99999999-1');
SET @prov = LAST_INSERT_ID();
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('SPTEST Cola', '2.25L x6', 12500, 10, 2, @cat, @prov);
SET @cola = LAST_INSERT_ID();
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('SPTEST Agua', '1.5L x6', 4000, 1, 2, @cat, @prov);
SET @agua = LAST_INSERT_ID();
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('SPTEST Almacen', '20-99999999-1', 'Calle 1', 'Centro');
SET @cli = LAST_INSERT_ID();

-- Pedido 1: 3 Cola (alcanza)
INSERT INTO pedidos (cliente_id, usuario_id) VALUES (@cli, @u);
SET @p_ok = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@p_ok, @cola, 3, 12500);

-- Pedido 2: 2 Cola (alcanza) + 5 Agua (no alcanza: hay 1)
INSERT INTO pedidos (cliente_id, usuario_id) VALUES (@cli, @u);
SET @p_sin_stock = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@p_sin_stock, @cola, 2, 12500), (@p_sin_stock, @agua, 5, 4000);

-- Pedido 3: sin lineas
INSERT INTO pedidos (cliente_id, usuario_id) VALUES (@cli, @u);
SET @p_vacio = LAST_INSERT_ID();

-- -------------------------------------------------------------
SELECT '--- 1. COMMIT: confirmar un pedido con stock suficiente' AS prueba;
CALL sp_confirmar_pedido(@p_ok, @u);
SELECT estado, 'CONFIRMADO' AS esperado_estado, total, '37500.00' AS esperado_total
  FROM pedidos WHERE id = @p_ok;
SELECT stock AS stock_cola, 7 AS esperado FROM productos WHERE id = @cola;
SELECT COUNT(*) AS movimientos_salida, 1 AS esperado
  FROM movimientos_stock WHERE pedido_id = @p_ok AND tipo = 'SALIDA';

-- -------------------------------------------------------------
SELECT '--- 2. ROLLBACK: una linea sin stock deshace todo (DEBE FALLAR con 50004)' AS prueba;
CALL sp_confirmar_pedido(@p_sin_stock, @u);
SELECT estado, 'PENDIENTE' AS esperado FROM pedidos WHERE id = @p_sin_stock;
SELECT stock AS stock_cola, 7 AS esperado_sin_cambios FROM productos WHERE id = @cola;
SELECT stock AS stock_agua, 1 AS esperado_sin_cambios FROM productos WHERE id = @agua;
SELECT COUNT(*) AS movimientos, 0 AS esperado
  FROM movimientos_stock WHERE pedido_id = @p_sin_stock;

-- -------------------------------------------------------------
SELECT '--- 3. DEBE FALLAR con 50002: confirmar dos veces el mismo pedido' AS prueba;
CALL sp_confirmar_pedido(@p_ok, @u);
SELECT stock AS stock_cola, 7 AS esperado_sin_cambios FROM productos WHERE id = @cola;

-- -------------------------------------------------------------
SELECT '--- 4. DEBE FALLAR con 50003: pedido sin lineas' AS prueba;
CALL sp_confirmar_pedido(@p_vacio, @u);

-- -------------------------------------------------------------
SELECT '--- 5. DEBE FALLAR con 50001: pedido inexistente' AS prueba;
CALL sp_confirmar_pedido(999999, @u);

-- -------------------------------------------------------------
SELECT '--- 6. DEBE FALLAR con 50005: usuario inexistente' AS prueba;
CALL sp_confirmar_pedido(@p_sin_stock, 999999);
SELECT estado, 'PENDIENTE' AS esperado FROM pedidos WHERE id = @p_sin_stock;

-- -------------------------------------------------------------
-- Limpieza
-- -------------------------------------------------------------
DELETE FROM movimientos_stock WHERE pedido_id IN (@p_ok, @p_sin_stock, @p_vacio);
DELETE FROM pedidos WHERE id IN (@p_ok, @p_sin_stock, @p_vacio);
DELETE FROM clientes WHERE id = @cli;
DELETE FROM productos WHERE id IN (@cola, @agua);
DELETE FROM proveedores WHERE id = @prov;
DELETE FROM categorias WHERE id = @cat;
DELETE FROM usuarios WHERE id = @u;
SELECT COUNT(*) AS restos_de_prueba, 0 AS esperado FROM usuarios WHERE email = 'sptest@test.com';
