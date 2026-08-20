-- Muestra el código completo de las funciones que mueven el stock.
-- Correlo en Supabase → SQL Editor y pasame el resultado.
--
-- Si en la grilla el texto sale cortado, hacé click en la celda
-- "codigo" para expandirla y copiar todo.

SELECT
  p.proname AS funcion,
  pg_get_functiondef(p.oid) AS codigo
FROM pg_proc p
WHERE p.proname IN (
  SELECT DISTINCT pr.proname
  FROM pg_trigger t
  JOIN pg_proc pr ON pr.oid = t.tgfoid
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname IN ('ventas_detalle', 'compras')
    AND NOT t.tgisinternal
);
