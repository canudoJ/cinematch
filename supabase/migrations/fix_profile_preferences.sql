-- =====================================================
-- SCRIPT: Añadir columnas de preferencias al perfil
-- EJECUTAR en: Supabase > SQL Editor
-- =====================================================

-- 1. Añadir columna preferred_platforms (array de texto, IDs de proveedores TMDB)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_platforms text[] DEFAULT '{}';

-- 2. Añadir columna preferred_content_types (array de texto: 'movie', 'tv')
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_content_types text[] DEFAULT '{}';

-- 3. Asegurarse de que preferred_genres también existe (puede que ya esté)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_genres text[] DEFAULT '{}';

-- 4. Actualizar la política RLS para que el usuario pueda leer/escribir sus propias preferencias
-- (Las políticas existentes de profiles ya cubren esto si permiten UPDATE en todas las columnas)

-- Verificar que las columnas se han creado:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('preferred_platforms', 'preferred_content_types', 'preferred_genres')
ORDER BY column_name;
