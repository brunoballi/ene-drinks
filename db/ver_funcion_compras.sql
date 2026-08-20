-- Código de la función que suma stock al registrar una compra.
-- Correlo en Supabase → SQL Editor y pasame el resultado.
-- Si el texto sale cortado, click en la celda para expandirla.

SELECT
  p.proname AS funcion,
  pg_get_functiondef(p.oid) AS codigo
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'compras'
  AND NOT t.tgisinternal;
