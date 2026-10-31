-- =============================================================
-- Distribuidora de bebidas - Consultas de reportes (tarea D4)
--
-- Las consultas que piden los requisitos:
--   1. INNER JOIN   -> detalle de pedidos
--   2. Subconsulta  -> clientes sobre el promedio, productos sin ventas
--   3. GROUP BY     -> ventas por zona y categoria, ranking de productos
-- Al final va el reporte de stock bajo, que es una consulta simple.
--
-- Cada consulta coincide con un endpoint de docs/contrato-api.md
-- (seccion Reportes). El backend (B7) las copia en su repositorio y
-- reemplaza las variables @desde, @hasta y @dias por parametros %s.
--
-- Una venta es un pedido CONFIRMADO o ENTREGADO. Los PENDIENTE no
-- descontaron stock y los CANCELADO no se cobraron.
-- El rango de fechas es inclusivo: @hasta abarca el dia completo.
--
-- Para correrlo:
--   Get-Content database/consultas/reportes.sql | docker exec -i tpf-mds-db mysql -uroot -proot --table distribuidora
-- Este archivo esta fuera de la raiz de database/, asi que Docker no
-- lo ejecuta al crear la base.
-- =============================================================

-- Valores por defecto: si ya vienen definidos (por ejemplo desde
-- database/tests/04_consultas_reportes.sql), se respetan.
SET @desde = COALESCE(@desde, '2026-08-01');
SET @hasta = COALESCE(@hasta, '2026-10-31');
SET @dias  = COALESCE(@dias, 30);

-- -------------------------------------------------------------
-- 1. INNER JOIN: detalle de pedidos
-- GET /reportes/detalle-pedidos
-- Une 5 tablas: cada linea vendida con su pedido, cliente,
-- vendedor y producto.
-- -------------------------------------------------------------
SELECT p.id                               AS pedido_id,
       p.fecha,
       c.razon_social                     AS cliente,
       c.zona,
       u.nombre                           AS vendedor,
       CONCAT(pr.nombre, ' ', pr.presentacion) AS producto,
       d.cantidad,
       d.cantidad * d.precio_unitario     AS subtotal
  FROM pedidos p
 INNER JOIN clientes c        ON c.id  = p.cliente_id
 INNER JOIN usuarios u        ON u.id  = p.usuario_id
 INNER JOIN detalle_pedido d  ON d.pedido_id = p.id
 INNER JOIN productos pr      ON pr.id = d.producto_id
 WHERE p.estado IN ('CONFIRMADO', 'ENTREGADO')
   AND p.fecha >= @desde
   AND p.fecha <  @hasta + INTERVAL 1 DAY
 ORDER BY p.fecha, p.id, d.id;

-- -------------------------------------------------------------
-- 2a. Subconsulta: clientes que compraron mas que el promedio
-- GET /reportes/clientes-sobre-promedio
-- `totales` suma lo comprado por cada cliente en el rango. La
-- subconsulta del WHERE calcula el promedio de esos totales y deja
-- solo a los clientes que lo superan.
-- -------------------------------------------------------------
WITH totales AS (
       SELECT cliente_id, SUM(total) AS total_comprado
         FROM pedidos
        WHERE estado IN ('CONFIRMADO', 'ENTREGADO')
          AND fecha >= @desde
          AND fecha <  @hasta + INTERVAL 1 DAY
        GROUP BY cliente_id
     )
SELECT c.id              AS cliente_id,
       c.razon_social,
       t.total_comprado,
       ROUND((SELECT AVG(total_comprado) FROM totales), 2) AS promedio_general
  FROM totales t
 INNER JOIN clientes c ON c.id = t.cliente_id
 WHERE t.total_comprado > (SELECT AVG(total_comprado) FROM totales)
 ORDER BY t.total_comprado DESC;

-- -------------------------------------------------------------
-- 2b. Subconsulta: productos sin ventas en los ultimos @dias dias
-- GET /reportes/productos-sin-ventas?dias=30
-- NOT IN con una subconsulta que lista los productos vendidos.
-- -------------------------------------------------------------
SELECT pr.id   AS producto_id,
       pr.nombre,
       pr.presentacion,
       pr.stock
  FROM productos pr
 WHERE pr.id NOT IN (
        SELECT d.producto_id
          FROM detalle_pedido d
         INNER JOIN pedidos p ON p.id = d.pedido_id
         WHERE p.estado IN ('CONFIRMADO', 'ENTREGADO')
           AND p.fecha >= CURDATE() - INTERVAL @dias DAY
       )
 ORDER BY pr.nombre;

-- -------------------------------------------------------------
-- 3a. GROUP BY: ventas por zona y categoria
-- GET /reportes/ventas-por-zona-categoria
-- COUNT(DISTINCT) porque un pedido puede tener varias lineas de la
-- misma categoria.
-- -------------------------------------------------------------
SELECT c.zona,
       cat.nombre                            AS categoria,
       COUNT(DISTINCT p.id)                  AS pedidos,
       SUM(d.cantidad)                       AS unidades,
       SUM(d.cantidad * d.precio_unitario)   AS total
  FROM pedidos p
 INNER JOIN clientes c       ON c.id   = p.cliente_id
 INNER JOIN detalle_pedido d ON d.pedido_id = p.id
 INNER JOIN productos pr     ON pr.id  = d.producto_id
 INNER JOIN categorias cat   ON cat.id = pr.categoria_id
 WHERE p.estado IN ('CONFIRMADO', 'ENTREGADO')
   AND p.fecha >= @desde
   AND p.fecha <  @hasta + INTERVAL 1 DAY
 GROUP BY c.zona, cat.nombre
 ORDER BY c.zona, total DESC;

-- -------------------------------------------------------------
-- 3b. GROUP BY: ranking de productos mas vendidos
-- GET /reportes/ranking-productos?limite=10
-- -------------------------------------------------------------
SELECT pr.id                                 AS producto_id,
       CONCAT(pr.nombre, ' ', pr.presentacion) AS nombre,
       SUM(d.cantidad)                       AS unidades,
       SUM(d.cantidad * d.precio_unitario)   AS total
  FROM detalle_pedido d
 INNER JOIN pedidos p    ON p.id  = d.pedido_id
 INNER JOIN productos pr ON pr.id = d.producto_id
 WHERE p.estado IN ('CONFIRMADO', 'ENTREGADO')
   AND p.fecha >= @desde
   AND p.fecha <  @hasta + INTERVAL 1 DAY
 GROUP BY pr.id, pr.nombre, pr.presentacion
 ORDER BY unidades DESC, total DESC
 LIMIT 10;  -- B7: LIMIT %s con el parametro ?limite=

-- -------------------------------------------------------------
-- 4. Simple: productos con stock en o por debajo del minimo
-- GET /reportes/stock-bajo
-- -------------------------------------------------------------
SELECT pr.id          AS producto_id,
       CONCAT(pr.nombre, ' ', pr.presentacion) AS nombre,
       pr.stock,
       pr.stock_minimo,
       pv.razon_social AS proveedor
  FROM productos pr
 INNER JOIN proveedores pv ON pv.id = pr.proveedor_id
 WHERE pr.stock <= pr.stock_minimo
 ORDER BY pr.stock - pr.stock_minimo, pr.nombre;
