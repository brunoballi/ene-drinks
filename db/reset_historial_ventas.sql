-- ============================================================
-- RESET DE HISTORIAL DE VENTAS — Flowi Gestor / ex ENE Drinks
-- ============================================================
-- Borra TODO el historial de ventas (tablas "ventas" y "ventas_detalle")
-- y reinicia la numeración (el próximo venta será la #1).
--
-- NO TOCA: productos, stock, categorías, proveedores, compras.
--
-- ⚠️ IRREVERSIBLE. No hay backup automático. Ejecutar solo cuando
-- estés seguro de que el cliente quiere borrar todo el historial.
--
-- Cómo correrlo:
--   1. Entrá al dashboard de Supabase del proyecto (mhnqidgxbwfdibrnaabs).
--   2. Abrí el SQL Editor (mismo lugar donde se corrió fix_rls.sql).
--   3. Pegá este script completo y ejecutalo.
-- ============================================================

TRUNCATE TABLE ventas_detalle, ventas RESTART IDENTITY CASCADE;
