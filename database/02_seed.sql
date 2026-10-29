-- =============================================================
-- Distribuidora de bebidas - Usuarios de prueba (uno por rol)
-- Corre solo la primera vez que MySQL inicializa el volumen.
-- Los hashes bcrypt corresponden a las contraseñas indicadas
-- al lado de cada usuario (solo para desarrollo).
-- =============================================================
USE distribuidora;

INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo) VALUES
  ('Ana Admin',       'admin@distribuidora.com',        '$2b$12$UtytuB6NE3PHUpgCecIGKufe2Mrht7txCZEn0HkNvF7wUHG8psBp.',     1, TRUE),
  ('Valen Vendedor',  'ventas@distribuidora.com',       '$2b$12$yEuBsC0Wyt89sZ4FzSLCFumgdh80hWRYyg81C7Uf24RLSknL8I4mK',  2, TRUE),
  ('Dami Deposito',   'deposito@distribuidora.com',     '$2b$12$2IRxz.Hz9Pp4aeO3/LsnuOMC20kO62ITcCpR7ug1b2Xs/xgCej7cq',  3, TRUE);
