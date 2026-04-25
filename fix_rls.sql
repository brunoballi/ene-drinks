-- ============================================================
-- FIX: Políticas RLS para anon (sin auth activo)
-- Ejecutar en Supabase SQL Editor
-- Permite que la anon key lea/escriba todas las tablas
-- mientras no se implemente Supabase Auth
-- ============================================================

-- Opción A (RECOMENDADA para desarrollo): desactivar RLS temporalmente
-- Descomentar estas líneas si querés la solución más simple:
/*
ALTER TABLE categorias    DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores   DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas        DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE compras       DISABLE ROW LEVEL SECURITY;
*/

-- Opción B (más correcta): agregar políticas para anon también
-- Esto permite que la anon key opere igual que authenticated

-- Primero eliminar las políticas existentes
DROP POLICY IF EXISTS "auth_select" ON categorias;
DROP POLICY IF EXISTS "auth_select" ON proveedores;
DROP POLICY IF EXISTS "auth_all"    ON productos;
DROP POLICY IF EXISTS "auth_all"    ON ventas;
DROP POLICY IF EXISTS "auth_all"    ON ventas_detalle;
DROP POLICY IF EXISTS "auth_all"    ON compras;
DROP POLICY IF EXISTS "auth_all"    ON proveedores;

-- Recrear políticas que aceptan anon Y authenticated
CREATE POLICY "allow_all_roles" ON categorias
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "allow_all_roles" ON proveedores
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "allow_all_roles" ON productos
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "allow_all_roles" ON ventas
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "allow_all_roles" ON ventas_detalle
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "allow_all_roles" ON compras
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

-- También aplicar a las vistas
ALTER VIEW v_stock           OWNER TO postgres;
ALTER VIEW v_ganancias       OWNER TO postgres;
ALTER VIEW v_ventas_completas OWNER TO postgres;
ALTER VIEW v_resumen_diario  OWNER TO postgres;

-- Verificar que las políticas quedaron bien
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
