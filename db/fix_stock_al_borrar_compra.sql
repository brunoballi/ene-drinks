-- ============================================================
-- FIX — Revertir stock y deuda al borrar una compra
-- ============================================================
-- Problema:
--   trg_aumentar_stock (AFTER INSERT en compras) hace dos cosas:
--     1. suma el stock del producto
--     2. si la compra está impaga, suma la deuda del proveedor
--   No existe ningún trigger que revierta eso al borrar la compra.
--
-- Este script agrega el trigger que faltaba, revirtiendo AMBAS cosas.
--
-- ✅ Seguro de correr en cualquier momento. No modifica datos
--    existentes, solo cambia el comportamiento de acá en adelante.
--
-- ⚠️ No corrige hacia atrás: si ya borraste compras antes, esas
--    diferencias hay que ajustarlas a mano.
--
-- Correlo en: Supabase → SQL Editor → pegar → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.revertir_stock_compra()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stock_un   INTEGER;
  v_stock_caja INTEGER;
  v_uxc        INTEGER;
  v_restante   INTEGER;
  v_cajas_usar INTEGER;
BEGIN
  SELECT stock_un, stock_caja, unidades_x_caja
    INTO v_stock_un, v_stock_caja, v_uxc
    FROM productos WHERE id = OLD.producto_id;

  IF OLD.tipo = 'CAJA' THEN
    IF v_stock_caja < OLD.cantidad THEN
      RAISE EXCEPTION 'No se puede borrar esta compra: aportó % cajas pero solo quedan % en stock. Probablemente ya se vendieron. Ajustá el stock a mano, o editá la compra en lugar de borrarla.',
        OLD.cantidad, v_stock_caja;
    END IF;
    UPDATE productos SET stock_caja = stock_caja - OLD.cantidad
     WHERE id = OLD.producto_id;

  ELSE -- UN
    -- Misma lógica que descontar_stock_venta: si no alcanzan las
    -- unidades sueltas, se abren cajas para cubrir la diferencia.
    IF (v_stock_un + v_stock_caja * v_uxc) < OLD.cantidad THEN
      RAISE EXCEPTION 'No se puede borrar esta compra: aportó % unidades pero solo quedan % en stock. Probablemente ya se vendieron. Ajustá el stock a mano, o editá la compra en lugar de borrarla.',
        OLD.cantidad, (v_stock_un + v_stock_caja * v_uxc);
    END IF;

    IF v_stock_un >= OLD.cantidad THEN
      UPDATE productos SET stock_un = stock_un - OLD.cantidad
       WHERE id = OLD.producto_id;
    ELSE
      v_restante   := OLD.cantidad - v_stock_un;
      v_cajas_usar := CEIL(v_restante::NUMERIC / v_uxc);
      UPDATE productos SET
        stock_un   = (v_cajas_usar * v_uxc) - v_restante,
        stock_caja = stock_caja - v_cajas_usar
      WHERE id = OLD.producto_id;
    END IF;
  END IF;

  -- Revertir la deuda, solo si la compra estaba impaga
  -- (es la condición exacta con la que se sumó al registrarla)
  IF NOT OLD.pagado AND OLD.proveedor_id IS NOT NULL THEN
    UPDATE proveedores SET deuda = deuda - OLD.costo_total
     WHERE id = OLD.proveedor_id;
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_revertir_stock_compra ON compras;

CREATE TRIGGER trg_revertir_stock_compra
AFTER DELETE ON compras
FOR EACH ROW
EXECUTE FUNCTION revertir_stock_compra();

-- Verificación: compras debe quedar con 2 triggers
--   trg_aumentar_stock         AFTER INSERT
--   trg_revertir_stock_compra  AFTER DELETE   <-- el nuevo
SELECT t.tgname AS trigger, pg_get_triggerdef(t.oid) AS definicion
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'compras' AND NOT t.tgisinternal
ORDER BY t.tgname;
