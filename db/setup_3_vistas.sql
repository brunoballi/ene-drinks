-- ============================================================
-- PARTE 3 — Cerrar también las vistas
-- ============================================================
-- Problema detectado:
--   setup_2_seguridad.sql cerró las TABLAS, pero las VISTAS
--   (v_stock, v_ganancias, v_resumen_diario) siguen abiertas.
--
--   Motivo: el fix_rls.sql original les hizo "ALTER VIEW ... OWNER
--   TO postgres". Una vista corre con los permisos de su dueño, así
--   que al ser de postgres se saltea el RLS de las tablas de abajo.
--   Resultado: con la anon key se puede leer el catálogo completo
--   con precios y costos, sin estar logueado.
--
-- Solución:
--   security_invoker = on hace que la vista corra con los permisos
--   de QUIEN la consulta, no de su dueño. Así se aplica el RLS.
--
-- ✅ La app sigue funcionando igual: los usuarios logueados tienen
--    permiso de lectura sobre las tablas de abajo.
--
-- Requiere PostgreSQL 15 o superior (Supabase actual lo cumple).
--
-- Correlo en: Supabase → SQL Editor → pegar → Run
-- ============================================================

ALTER VIEW v_stock           SET (security_invoker = on);
ALTER VIEW v_ganancias       SET (security_invoker = on);
ALTER VIEW v_resumen_diario  SET (security_invoker = on);

-- Esta puede no existir en tu proyecto; si da error, ignoralo
-- y comentá esta línea.
ALTER VIEW v_ventas_completas SET (security_invoker = on);

-- Verificación: las 4 deben decir security_invoker=on
SELECT c.relname AS vista, c.reloptions AS opciones
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
ORDER BY c.relname;
