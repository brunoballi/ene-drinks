-- ============================================================
-- PARTE 1 — Tabla del negocio + bucket del logo
-- ============================================================
-- ✅ SEGURO de correr AHORA MISMO.
--    No rompe nada: solo agrega cosas nuevas. La app que está hoy
--    en producción sigue funcionando igual.
--
-- Correlo en: Supabase → SQL Editor → pegar → Run
-- Es seguro volver a correrlo si hace falta.
-- ============================================================

-- Tabla de configuración del negocio (fila única, id = 1)
CREATE TABLE IF NOT EXISTS negocio (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nombre TEXT NOT NULL DEFAULT 'Flowi Gestor',
  logo_url TEXT,
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT negocio_single_row CHECK (id = 1)
);

INSERT INTO negocio (id, nombre)
VALUES (1, 'Flowi Gestor')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE negocio ENABLE ROW LEVEL SECURITY;

-- Por ahora abierta (igual que el resto de las tablas hoy).
-- La PARTE 2 la cierra a usuarios logueados.
DROP POLICY IF EXISTS "negocio_authenticated" ON negocio;
DROP POLICY IF EXISTS "negocio_abierta" ON negocio;
CREATE POLICY "negocio_abierta" ON negocio
  FOR ALL USING (auth.role() IN ('anon', 'authenticated'));

-- Bucket de Storage para el logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_write" ON storage.objects;
CREATE POLICY "logos_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "logos_update" ON storage.objects;
CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() IN ('anon', 'authenticated'));

-- Verificación
SELECT 'Tabla negocio creada' AS resultado, nombre FROM negocio WHERE id = 1;
