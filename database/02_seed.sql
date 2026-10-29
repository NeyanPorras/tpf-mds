-- =============================================================
-- Distribuidora de bebidas - Datos de prueba
-- Usuarios, catalogo, clientes y stock inicial. Los pedidos estan
-- en 04_seed_pedidos.sql (necesitan el procedimiento de 03).
-- Corre solo la primera vez que MySQL inicializa el volumen.
-- =============================================================
USE distribuidora;

-- -------------------------------------------------------------
-- Usuarios (uno por rol). Contraseñas, solo para desarrollo:
--   admin@distribuidora.com     Admin123!
--   ventas@distribuidora.com    Venta123!
--   deposito@distribuidora.com  Deposito123!
-- -------------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo) VALUES
  ('Ana Admin',       'admin@distribuidora.com',        '$2b$12$UtytuB6NE3PHUpgCecIGKufe2Mrht7txCZEn0HkNvF7wUHG8psBp.',     1, TRUE),
  ('Valen Vendedor',  'ventas@distribuidora.com',       '$2b$12$yEuBsC0Wyt89sZ4FzSLCFumgdh80hWRYyg81C7Uf24RLSknL8I4mK',  2, TRUE),
  ('Dami Deposito',   'deposito@distribuidora.com',     '$2b$12$2IRxz.Hz9Pp4aeO3/LsnuOMC20kO62ITcCpR7ug1b2Xs/xgCej7cq',  3, TRUE);

-- -------------------------------------------------------------
-- Catalogo
-- -------------------------------------------------------------
INSERT INTO categorias (nombre) VALUES
  ('Gaseosas'),
  ('Aguas'),
  ('Cervezas'),
  ('Vinos'),
  ('Jugos'),
  ('Energizantes');

INSERT INTO proveedores (razon_social, cuit, telefono, email) VALUES
  ('Embotelladora del Litoral S.A.', '30-71234567-8', '0342-4551234', 'ventas@embolitoral.com.ar'),
  ('Aguas del Paraná S.R.L.', '30-70987654-3', '0343-4223344', 'pedidos@aguasparana.com.ar'),
  ('Cervecería Santa Fe Distribución S.A.', '30-69852147-1', '0342-4129900', 'comercial@cervsf.com.ar'),
  ('Bodegas Cuyanas S.A.', '30-71456321-9', '0261-4987766', 'ventas@bodegascuyanas.com.ar'),
  ('Jugos Naturales del Norte S.R.L.', '30-71598742-5', '0381-4302211', 'info@jugosnorte.com.ar'),
  ('Energía Bebidas Importadora S.A.', '30-71865320-2', '011-48765432', 'ventas@energiabebidas.com.ar');

-- El stock arranca en 0: lo cargan los ingresos de mercaderia de abajo
-- y lo descuentan los pedidos confirmados de 04_seed_pedidos.sql.
INSERT INTO productos (nombre, presentacion, precio, stock, stock_minimo, categoria_id, proveedor_id) VALUES
  ('Coca-Cola', '2.25L x6', 18500.00, 0, 20, 1, 1),
  ('Coca-Cola Zero', '2.25L x6', 18500.00, 0, 15, 1, 1),
  ('Sprite', '2.25L x6', 16800.00, 0, 10, 1, 1),
  ('Fanta Naranja', '2.25L x6', 16800.00, 0, 10, 1, 1),
  ('Coca-Cola', '500ml x12', 21600.00, 0, 12, 1, 1),
  ('Pepsi', '2.25L x6', 15900.00, 0, 10, 1, 1),
  ('Agua mineral Villavicencio', '1.5L x6', 7200.00, 0, 25, 2, 2),
  ('Agua mineral Villavicencio', '500ml x12', 8400.00, 0, 20, 2, 2),
  ('Agua con gas Eco de los Andes', '1.5L x6', 7800.00, 0, 15, 2, 2),
  ('Agua saborizada Levité Pomelo', '1.5L x6', 9600.00, 0, 15, 2, 2),
  ('Agua saborizada Levité Manzana', '1.5L x6', 9600.00, 0, 15, 2, 2),
  ('Cerveza Quilmes Clásica', '1L x12', 32400.00, 0, 15, 3, 3),
  ('Cerveza Quilmes Clásica', '473ml lata x24', 38400.00, 0, 10, 3, 3),
  ('Cerveza Brahma', '1L x12', 30000.00, 0, 10, 3, 3),
  ('Cerveza Stella Artois', '473ml lata x24', 52800.00, 0, 8, 3, 3),
  ('Cerveza Patagonia Amber Lager', '730ml x6', 27600.00, 0, 6, 3, 3),
  ('Cerveza Andes Origen Rubia', '473ml lata x24', 40800.00, 0, 8, 3, 3),
  ('Vino Malbec Alamos', '750ml x6', 43200.00, 0, 6, 4, 4),
  ('Vino Cabernet Santa Julia', '750ml x6', 31800.00, 0, 6, 4, 4),
  ('Vino Torrontés Colomé', '750ml x6', 46800.00, 0, 4, 4, 4),
  ('Vino de mesa Toro Tinto', '1L x12', 26400.00, 0, 10, 4, 4),
  ('Vino Malbec Trapiche Varietal', '750ml x6', 28200.00, 0, 6, 4, 4),
  ('Jugo Cepita Naranja', '1L x8', 14400.00, 0, 10, 5, 5),
  ('Jugo Cepita Durazno', '1L x8', 14400.00, 0, 8, 5, 5),
  ('Jugo Baggio Multifruta', '1L x8', 11200.00, 0, 8, 5, 5),
  ('Jugo Ades Manzana', '1L x6', 12600.00, 0, 6, 5, 5),
  ('Speed Energy', '250ml lata x24', 36000.00, 0, 6, 6, 6),
  ('Red Bull', '250ml lata x24', 60000.00, 0, 4, 6, 6),
  ('Monster Energy', '473ml lata x24', 64800.00, 0, 4, 6, 6),
  ('Gatorade Manzana', '500ml x6', 10800.00, 0, 8, 6, 6);

-- -------------------------------------------------------------
-- Clientes
-- -------------------------------------------------------------
INSERT INTO clientes (razon_social, cuit, direccion, zona, telefono) VALUES
  ('Almacén Don Pepe', '20-28765432-1', 'San Martín 1234', 'Centro', '342-5123456'),
  ('Kiosco La Esquina', '27-31456789-4', '25 de Mayo 2210', 'Centro', '342-5234567'),
  ('Supermercado El Ahorro S.R.L.', '30-71122334-6', 'Bv. Pellegrini 3150', 'Centro', '342-4561122'),
  ('Bar Los Amigos', '20-25987412-7', 'Rivadavia 2875', 'Centro', '342-5345678'),
  ('Restaurante El Quincho', '30-71233445-2', 'Av. Freyre 1840', 'Centro', '342-4673344'),
  ('Despensa Norte', '20-33654987-5', 'Av. Peñaloza 7120', 'Norte', '342-5456789'),
  ('Autoservicio Guadalupe', '30-71344556-8', 'Javier de la Rosa 455', 'Norte', '342-4785566'),
  ('Kiosco El Pibe', '23-35789456-9', 'Av. Blas Parera 8800', 'Norte', '342-5567890'),
  ('Club Atlético Barrio Norte', '30-60876543-1', 'Gorriti 3900', 'Norte', '342-4897788'),
  ('Maxikiosco 24 Horas', '20-30147258-3', 'Av. Aristóbulo del Valle 6500', 'Norte', '342-5678901'),
  ('Almacén Barranquitas', '27-29369258-0', 'Estrada 4120', 'Sur', '342-5789012'),
  ('Distribuidora Sur Express S.A.', '30-71455667-4', 'Av. J. J. Paso 2950', 'Sur', '342-4909900'),
  ('Parrilla Don Carlos', '20-27412589-6', 'Av. Gral. López 3300', 'Sur', '342-5890123'),
  ('Kiosco Santa Rosa', '23-34852963-9', 'Mendoza 4410', 'Sur', '342-5901234'),
  ('Mercadito San Lorenzo', '30-71566778-0', 'Av. Galicia 2050', 'Sur', '342-4012233');

-- -------------------------------------------------------------
-- Ingreso inicial de mercaderia (1/8/2026, usuario Deposito)
-- -------------------------------------------------------------
INSERT INTO movimientos_stock (producto_id, usuario_id, tipo, cantidad, fecha, observacion) VALUES
  (1, 3, 'ENTRADA', 29, '2026-08-01 09:00:00', 'Stock inicial'),
  (2, 3, 'ENTRADA', 61, '2026-08-01 09:00:00', 'Stock inicial'),
  (3, 3, 'ENTRADA', 72, '2026-08-01 09:00:00', 'Stock inicial'),
  (4, 3, 'ENTRADA', 77, '2026-08-01 09:00:00', 'Stock inicial'),
  (5, 3, 'ENTRADA', 70, '2026-08-01 09:00:00', 'Stock inicial'),
  (6, 3, 'ENTRADA', 55, '2026-08-01 09:00:00', 'Stock inicial'),
  (7, 3, 'ENTRADA', 101, '2026-08-01 09:00:00', 'Stock inicial'),
  (8, 3, 'ENTRADA', 34, '2026-08-01 09:00:00', 'Stock inicial'),
  (9, 3, 'ENTRADA', 56, '2026-08-01 09:00:00', 'Stock inicial'),
  (10, 3, 'ENTRADA', 79, '2026-08-01 09:00:00', 'Stock inicial'),
  (11, 3, 'ENTRADA', 45, '2026-08-01 09:00:00', 'Stock inicial'),
  (12, 3, 'ENTRADA', 86, '2026-08-01 09:00:00', 'Stock inicial'),
  (13, 3, 'ENTRADA', 20, '2026-08-01 09:00:00', 'Stock inicial'),
  (14, 3, 'ENTRADA', 83, '2026-08-01 09:00:00', 'Stock inicial'),
  (15, 3, 'ENTRADA', 86, '2026-08-01 09:00:00', 'Stock inicial'),
  (16, 3, 'ENTRADA', 21, '2026-08-01 09:00:00', 'Stock inicial'),
  (17, 3, 'ENTRADA', 64, '2026-08-01 09:00:00', 'Stock inicial'),
  (18, 3, 'ENTRADA', 55, '2026-08-01 09:00:00', 'Stock inicial'),
  (19, 3, 'ENTRADA', 50, '2026-08-01 09:00:00', 'Stock inicial'),
  (20, 3, 'ENTRADA', 65, '2026-08-01 09:00:00', 'Stock inicial'),
  (21, 3, 'ENTRADA', 28, '2026-08-01 09:00:00', 'Stock inicial'),
  (22, 3, 'ENTRADA', 44, '2026-08-01 09:00:00', 'Stock inicial'),
  (23, 3, 'ENTRADA', 8, '2026-08-01 09:00:00', 'Stock inicial'),
  (24, 3, 'ENTRADA', 27, '2026-08-01 09:00:00', 'Stock inicial'),
  (25, 3, 'ENTRADA', 60, '2026-08-01 09:00:00', 'Stock inicial'),
  (26, 3, 'ENTRADA', 38, '2026-08-01 09:00:00', 'Stock inicial'),
  (27, 3, 'ENTRADA', 87, '2026-08-01 09:00:00', 'Stock inicial'),
  (28, 3, 'ENTRADA', 13, '2026-08-01 09:00:00', 'Stock inicial'),
  (29, 3, 'ENTRADA', 73, '2026-08-01 09:00:00', 'Stock inicial'),
  (30, 3, 'ENTRADA', 62, '2026-08-01 09:00:00', 'Stock inicial');

UPDATE productos p
   SET p.stock = (SELECT SUM(m.cantidad) FROM movimientos_stock m
                   WHERE m.producto_id = p.id AND m.tipo = 'ENTRADA');
