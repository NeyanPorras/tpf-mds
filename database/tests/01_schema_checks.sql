-- =============================================================
-- Pruebas de restricciones del esquema (tarea D1)
-- Correr sobre una base recien creada con 01_schema.sql:
--   mysql -u root -p --force distribuidora < database/tests/01_schema_checks.sql
-- --force hace que siga despues de cada error: cada bloque
-- "DEBE FALLAR" tiene que mostrar un ERROR en la salida.
-- Todo se deshace con ROLLBACK al final.
-- =============================================================

START TRANSACTION;

-- Datos minimos para las pruebas
INSERT INTO usuarios (nombre, email, password_hash, rol_id)
  VALUES ('Prueba', 'prueba@test.com', 'x', 1);
SET @u = LAST_INSERT_ID();
INSERT INTO categorias (nombre) VALUES ('Gaseosas');
SET @cat = LAST_INSERT_ID();
INSERT INTO proveedores (razon_social, cuit) VALUES ('Prov SA', '30-71234567-8');
SET @prov = LAST_INSERT_ID();
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id)
  VALUES ('Coca-Cola', '2.25L x6', 12500, 10, 2, @cat, @prov);
SET @prod = LAST_INSERT_ID();
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('Almacen Don Pepe', '20-28765432-1', 'San Martin 1234', 'Centro');
SET @cli = LAST_INSERT_ID();
INSERT INTO pedidos (cliente_id, usuario_id) VALUES (@cli, @u);
SET @ped = LAST_INSERT_ID();
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@ped, @prod, 3, 12500);

SELECT '--- 1. DEBE FALLAR: stock negativo (ck_productos_stock)' AS prueba;
UPDATE productos SET stock = -1 WHERE id = @prod;

SELECT '--- 2. DEBE FALLAR: borrar producto con pedidos (fk_detalle_producto)' AS prueba;
DELETE FROM productos WHERE id = @prod;

SELECT '--- 3. DEBE FALLAR: CUIT con formato invalido (ck_clientes_cuit)' AS prueba;
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('Mal CUIT', '20287654321', 'X 1', 'Sur');

SELECT '--- 4. DEBE FALLAR: CUIT repetido (uq_clientes_cuit)' AS prueba;
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('Duplicado', '20-28765432-1', 'X 1', 'Sur');

SELECT '--- 5. DEBE FALLAR: cantidad cero (ck_detalle_cantidad)' AS prueba;
UPDATE detalle_pedido SET cantidad = 0 WHERE pedido_id = @ped;

SELECT '--- 6. DEBE FALLAR: producto repetido en el pedido (uq_detalle_pedido_producto)' AS prueba;
INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
  VALUES (@ped, @prod, 1, 12500);

SELECT '--- 7. DEBE FALLAR: SALIDA sin pedido (ck_movimientos_origen)' AS prueba;
INSERT INTO movimientos_stock (producto_id, usuario_id, tipo, cantidad)
  VALUES (@prod, @u, 'SALIDA', 1);

SELECT '--- 8. DEBE FALLAR: zona inexistente' AS prueba;
INSERT INTO clientes (razon_social, cuit, direccion, zona)
  VALUES ('Zona mala', '20-11111111-1', 'X 1', 'Oeste');

SELECT '--- 9. DEBE FUNCIONAR: borrar pedido borra sus lineas (CASCADE)' AS prueba;
DELETE FROM pedidos WHERE id = @ped;
SELECT COUNT(*) AS lineas_restantes_debe_ser_0 FROM detalle_pedido WHERE pedido_id = @ped;

ROLLBACK;
