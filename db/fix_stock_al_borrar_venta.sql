-- ============================================================
-- FIX — Devolver el stock al borrar una venta
-- ============================================================
-- Problema:
--   El trigger trg_descontar_stock (BEFORE INSERT en ventas_detalle)
--   descuenta stock al vender, pero no existe ningún trigger que lo
--   devuelva al borrar. Resultado: cada venta borrada dejaba el stock
--   descontado para siempre.
--
-- Este script agrega el trigger que faltaba.
--
-- ✅ Seguro de correr en cualquier momento. No modifica datos
--    existentes, solo cambia el comportamiento de acá en adelante.
--
-- ⚠️ No corrige hacia atrás: si ya borraste ventas antes, esas
--    diferencias hay que ajustarlas a mano desde el módulo de Stock.
--
-- Correlo en: Supabase → SQL Editor → pegar → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.restaurar_stock_venta()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.tipo = 'CAJA' THEN
    -- Inverso exacto: al vender se hizo stock_caja - cantidad
    UPDATE productos
       SET stock_caja = stock_caja + OLD.cantidad
     WHERE id = OLD.producto_id;

  ELSE -- UN
    -- Se devuelven las unidades como SUELTAS, no como cajas.
    --
    -- Por qué: al vender unidades, si no alcanzaban las sueltas el
    -- trigger abría cajas (stock_caja - N, y el sobrante quedó suelto).
    -- Esa operación depende del stock que había en ese momento, así que
    -- no se puede reconstruir el estado exacto anterior.
    --
    -- Lo que sí queda siempre correcto es el TOTAL en unidades, que es
    -- lo que usan v_stock.stock_total_un, las alertas y los reportes.
    --
    -- Además es lo más fiel a la realidad: una caja que se abrió para
    -- despachar la venta no vuelve a quedar cerrada en el depósito.
    UPDATE productos
       SET stock_un = stock_un + OLD.cantidad
     WHERE id = OLD.producto_id;
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restaurar_stock ON ventas_detalle;

CREATE TRIGGER trg_restaurar_stock
AFTER DELETE ON ventas_detalle
FOR EACH ROW
EXECUTE FUNCTION restaurar_stock_venta();

-- Verificación: ahora ventas_detalle debe tener 3 triggers
--   trg_descontar_stock     BEFORE INSERT
--   trg_actualizar_totales  AFTER INSERT OR DELETE OR UPDATE
--   trg_restaurar_stock     AFTER DELETE   <-- el nuevo
SELECT t.tgname AS trigger, pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'ventas_detalle' AND NOT t.tgisinternal
ORDER BY t.tgname;
