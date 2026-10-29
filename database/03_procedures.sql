-- =============================================================
-- Distribuidora de bebidas - Procedimientos almacenados
-- Ejecutar sobre la base creada por 01_schema.sql.
-- =============================================================
USE distribuidora;

-- -------------------------------------------------------------
-- sp_confirmar_pedido
--
-- Confirma un pedido PENDIENTE en una sola transaccion:
--   1. Bloquea el pedido y los productos de sus lineas (FOR UPDATE).
--   2. Valida estado, usuario, lineas y stock.
--   3. Descuenta stock, registra un movimiento SALIDA por linea,
--      calcula el total y pasa el pedido a CONFIRMADO.
-- Si cualquier paso falla: ROLLBACK y el error se relanza.
-- Si todo sale bien: COMMIT y devuelve una fila (id, estado, total).
--
-- Errores de negocio (SQLSTATE 45000), para mapear en el backend:
--   MYSQL_ERRNO  Codigo de la API      HTTP
--   50001        NOT_FOUND             404  El pedido no existe
--   50002        ESTADO_INVALIDO       409  El pedido no esta PENDIENTE
--   50003        BAD_REQUEST           400  El pedido no tiene lineas
--   50004        STOCK_INSUFICIENTE    409  Algun producto no alcanza
--   50005        BAD_REQUEST           400  Usuario inexistente o inactivo
--
-- Atencion: el procedimiento abre y cierra su propia transaccion.
-- Llamarlo con la conexion en autocommit y sin una transaccion abierta,
-- porque START TRANSACTION confirma implicitamente la anterior.
-- -------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_confirmar_pedido;

DELIMITER $$

CREATE PROCEDURE sp_confirmar_pedido(
  IN p_pedido_id  INT UNSIGNED,
  IN p_usuario_id INT UNSIGNED
)
BEGIN
  DECLARE v_estado    VARCHAR(20)   DEFAULT NULL;
  DECLARE v_lineas    INT           DEFAULT 0;
  DECLARE v_faltante  VARCHAR(121)  DEFAULT NULL;
  DECLARE v_total     DECIMAL(14,2) DEFAULT 0;
  DECLARE v_mensaje   VARCHAR(128);

  -- Cualquier error (de negocio o inesperado) deshace todo y se relanza.
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- 1. El pedido existe y esta PENDIENTE
  SELECT estado INTO v_estado
    FROM pedidos
   WHERE id = p_pedido_id
     FOR UPDATE;

  IF v_estado IS NULL THEN
    SET v_mensaje = CONCAT('El pedido ', p_pedido_id, ' no existe');
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 50001, MESSAGE_TEXT = v_mensaje;
  END IF;

  IF v_estado <> 'PENDIENTE' THEN
    SET v_mensaje = CONCAT('Solo se puede confirmar un pedido PENDIENTE (estado actual: ', v_estado, ')');
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 50002, MESSAGE_TEXT = v_mensaje;
  END IF;

  -- 2. El usuario que confirma existe y esta activo
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_id AND activo) THEN
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 50005,
      MESSAGE_TEXT = 'El usuario que confirma no existe o esta inactivo';
  END IF;

  -- 3. Bloquear los productos del pedido y contar las lineas
  SELECT COUNT(*) INTO v_lineas
    FROM detalle_pedido d
    JOIN productos p ON p.id = d.producto_id
   WHERE d.pedido_id = p_pedido_id
     FOR UPDATE;

  IF v_lineas = 0 THEN
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 50003,
      MESSAGE_TEXT = 'El pedido no tiene lineas';
  END IF;

  -- 4. Todas las lineas tienen stock suficiente
  SELECT CONCAT(p.nombre, ' ', p.presentacion) INTO v_faltante
    FROM detalle_pedido d
    JOIN productos p ON p.id = d.producto_id
   WHERE d.pedido_id = p_pedido_id
     AND d.cantidad > p.stock
   ORDER BY d.id
   LIMIT 1;

  IF v_faltante IS NOT NULL THEN
    SET v_mensaje = CONCAT('No hay stock suficiente de ', v_faltante);
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 50004, MESSAGE_TEXT = v_mensaje;
  END IF;

  -- 5. Descontar stock
  UPDATE productos p
    JOIN detalle_pedido d ON d.producto_id = p.id
     SET p.stock = p.stock - d.cantidad
   WHERE d.pedido_id = p_pedido_id;

  -- 6. Registrar un movimiento SALIDA por linea
  INSERT INTO movimientos_stock (producto_id, usuario_id, tipo, cantidad, observacion, pedido_id)
  SELECT d.producto_id, p_usuario_id, 'SALIDA', d.cantidad,
         CONCAT('Pedido #', p_pedido_id), p_pedido_id
    FROM detalle_pedido d
   WHERE d.pedido_id = p_pedido_id;

  -- 7. Calcular el total y confirmar el pedido
  SELECT SUM(d.cantidad * d.precio_unitario) INTO v_total
    FROM detalle_pedido d
   WHERE d.pedido_id = p_pedido_id;

  UPDATE pedidos
     SET estado = 'CONFIRMADO',
         total  = v_total
   WHERE id = p_pedido_id;

  COMMIT;

  SELECT id, estado, total FROM pedidos WHERE id = p_pedido_id;
END$$

DELIMITER ;
