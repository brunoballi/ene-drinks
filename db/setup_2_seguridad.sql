-- ============================================================
-- PARTE 2 — Cerrar el acceso a los datos
-- ============================================================
-- ⛔ NO lo corras todavía.
--
--    Correlo SOLO DESPUÉS de haber hecho git push y de que Vercel
--    haya terminado de deployar la versión con login.
--
--    Si lo corrés antes, la app que está online se queda sin poder
--    leer los datos (tablas vacías / errores) hasta que subas el
--    código nuevo.
--
-- Correlo en: Supabase → SQL Editor → pegar → Run
-- ============================================================

-- Hasta ahora la "anon key" (que viaja dentro del código que corre en
-- el navegador, o sea es pública) tenía acceso total a la base.
-- Esto lo cierra: de acá en más hay que estar logueado.

DROP POLICY IF EXISTS "allow_all_roles" ON categorias;
DROP POLICY IF EXISTS "allow_all_roles" ON proveedores;
DROP POLICY IF EXISTS "allow_all_roles" ON productos;
DROP POLICY IF EXISTS "allow_all_roles" ON ventas;
DROP POLICY IF EXISTS "allow_all_roles" ON ventas_detalle;
DROP POLICY IF EXISTS "allow_all_roles" ON compras;

DROP POLICY IF EXISTS "solo_autenticados" ON categorias;
CREATE POLICY "solo_autenticados" ON categorias FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "solo_autenticados" ON proveedores;
CREATE POLICY "solo_autenticados" ON proveedores FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "solo_autenticados" ON productos;
CREATE POLICY "solo_autenticados" ON productos FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "solo_autenticados" ON ventas;
CREATE POLICY "solo_autenticados" ON ventas FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "solo_autenticados" ON ventas_detalle;
CREATE POLICY "solo_autenticados" ON ventas_detalle FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "solo_autenticados" ON compras;
CREATE POLICY "solo_autenticados" ON compras FOR ALL USING (auth.role() = 'authenticated');

-- La tabla del negocio y el bucket del logo también
DROP POLICY IF EXISTS "negocio_abierta" ON negocio;
DROP POLICY IF EXISTS "negocio_authenticated" ON negocio;
CREATE POLICY "negocio_authenticated" ON negocio
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_write" ON storage.objects;
CREATE POLICY "logos_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_update" ON storage.objects;
CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Verificación: todas deberían decir "solo_autenticados" o "_authenticated"
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename;
