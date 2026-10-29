-- =============================================================
-- Distribuidora de bebidas - Esquema de base de datos
-- MySQL 8.0 · InnoDB · utf8mb4
-- Ejecutar: mysql -u root -p < database/01_schema.sql
-- ATENCION: borra y recrea la base completa.
-- =============================================================

DROP DATABASE IF EXISTS distribuidora;
CREATE DATABASE distribuidora
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE distribuidora;

-- -------------------------------------------------------------
-- Seguridad
-- -------------------------------------------------------------

CREATE TABLE roles (
  id      TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(20)      NOT NULL,
  CONSTRAINT pk_roles PRIMARY KEY (id),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

CREATE TABLE usuarios (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(80)      NOT NULL,
  email          VARCHAR(120)     NOT NULL,
  password_hash  VARCHAR(255)     NOT NULL,
  rol_id         TINYINT UNSIGNED NOT NULL,
  activo         BOOLEAN          NOT NULL DEFAULT TRUE,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT ck_usuarios_email CHECK (email LIKE '%_@_%._%'),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id)
    REFERENCES roles (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Catalogo
-- -------------------------------------------------------------

CREATE TABLE categorias (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(50)  NOT NULL,
  CONSTRAINT pk_categorias PRIMARY KEY (id),
  CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
  CONSTRAINT ck_categorias_nombre CHECK (CHAR_LENGTH(nombre) >= 2)
) ENGINE = InnoDB;

CREATE TABLE proveedores (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social  VARCHAR(120) NOT NULL,
  cuit          CHAR(13)     NOT NULL,
  telefono      VARCHAR(30)  NULL,
  email         VARCHAR(120) NULL,
  CONSTRAINT pk_proveedores PRIMARY KEY (id),
  CONSTRAINT uq_proveedores_cuit UNIQUE (cuit),
  CONSTRAINT ck_proveedores_cuit CHECK (REGEXP_LIKE(cuit, '^[0-9]{2}-[0-9]{8}-[0-9]$'))
) ENGINE = InnoDB;

CREATE TABLE productos (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(80)   NOT NULL,
  presentacion  VARCHAR(40)   NOT NULL,
  precio        DECIMAL(12,2) NOT NULL,
  stock         INT           NOT NULL DEFAULT 0,
  stock_minimo  INT           NOT NULL DEFAULT 0,
  categoria_id  INT UNSIGNED  NOT NULL,
  proveedor_id  INT UNSIGNED  NOT NULL,
  CONSTRAINT pk_productos PRIMARY KEY (id),
  CONSTRAINT uq_productos_nombre_presentacion UNIQUE (nombre, presentacion),
  CONSTRAINT ck_productos_precio CHECK (precio > 0),
  CONSTRAINT ck_productos_stock CHECK (stock >= 0),
  CONSTRAINT ck_productos_stock_minimo CHECK (stock_minimo >= 0),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id)
    REFERENCES proveedores (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Ventas
-- -------------------------------------------------------------

CREATE TABLE clientes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social  VARCHAR(120) NOT NULL,
  cuit          CHAR(13)     NOT NULL,
  direccion     VARCHAR(150) NOT NULL,
  zona          ENUM('Centro', 'Norte', 'Sur') NOT NULL,
  telefono      VARCHAR(30)  NULL,
  CONSTRAINT pk_clientes PRIMARY KEY (id),
  CONSTRAINT uq_clientes_cuit UNIQUE (cuit),
  CONSTRAINT ck_clientes_cuit CHECK (REGEXP_LIKE(cuit, '^[0-9]{2}-[0-9]{8}-[0-9]$'))
) ENGINE = InnoDB;

CREATE TABLE pedidos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cliente_id  INT UNSIGNED  NOT NULL,
  usuario_id  INT UNSIGNED  NOT NULL,
  fecha       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado      ENUM('PENDIENTE', 'CONFIRMADO', 'ENTREGADO', 'CANCELADO')
                            NOT NULL DEFAULT 'PENDIENTE',
  total       DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT pk_pedidos PRIMARY KEY (id),
  CONSTRAINT ck_pedidos_total CHECK (total >= 0),
  CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX ix_pedidos_fecha (fecha),
  INDEX ix_pedidos_estado (estado)
) ENGINE = InnoDB;

CREATE TABLE detalle_pedido (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pedido_id        INT UNSIGNED  NOT NULL,
  producto_id      INT UNSIGNED  NOT NULL,
  cantidad         INT           NOT NULL,
  precio_unitario  DECIMAL(12,2) NOT NULL,
  CONSTRAINT pk_detalle_pedido PRIMARY KEY (id),
  CONSTRAINT uq_detalle_pedido_producto UNIQUE (pedido_id, producto_id),
  CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_detalle_precio CHECK (precio_unitario > 0),
  CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Stock
-- -------------------------------------------------------------

CREATE TABLE movimientos_stock (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id  INT UNSIGNED NOT NULL,
  usuario_id   INT UNSIGNED NOT NULL,
  tipo         ENUM('ENTRADA', 'SALIDA') NOT NULL,
  cantidad     INT          NOT NULL,
  fecha        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion  VARCHAR(200) NULL,
  pedido_id    INT UNSIGNED NULL,
  CONSTRAINT pk_movimientos_stock PRIMARY KEY (id),
  CONSTRAINT ck_movimientos_cantidad CHECK (cantidad > 0),
  -- Una SALIDA siempre viene de un pedido; una ENTRADA nunca.
  CONSTRAINT ck_movimientos_origen CHECK (
    (tipo = 'SALIDA'  AND pedido_id IS NOT NULL) OR
    (tipo = 'ENTRADA' AND pedido_id IS NULL)
  ),
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX ix_movimientos_fecha (fecha)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Datos fijos: roles del sistema
-- -------------------------------------------------------------

INSERT INTO roles (nombre) VALUES ('ADMIN'), ('VENDEDOR'), ('DEPOSITO');
