-- Script para crear/verificar la estructura correcta de la tabla 'decks'
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla 'decks' si no existe
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1. Migrar de 'name' a 'title' si es necesario
DO $$ 
BEGIN
    -- Si existe la columna 'name' pero no 'title', renombrar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'title'
    ) THEN
        -- Renombrar 'name' a 'title'
        ALTER TABLE public.decks RENAME COLUMN name TO title;
    END IF;
    
    -- Si no existe ninguna de las dos, crear 'title'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'title'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.decks ADD COLUMN title TEXT;
        -- Si hay registros existentes, darles un título por defecto
        UPDATE public.decks SET title = 'Sin título' WHERE title IS NULL;
        -- Hacer la columna NOT NULL después de actualizar
        ALTER TABLE public.decks ALTER COLUMN title SET NOT NULL;
    END IF;
    
    -- Asegurar que 'title' no sea NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'title'
    ) THEN
        -- Actualizar valores NULL si existen
        UPDATE public.decks SET title = 'Sin título' WHERE title IS NULL;
        -- Asegurar que la columna sea NOT NULL
        ALTER TABLE public.decks ALTER COLUMN title SET NOT NULL;
    END IF;
END $$;

-- 2. Crear la tabla 'deck_items' si no existe
CREATE TABLE IF NOT EXISTS public.deck_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    media_type TEXT DEFAULT 'movie',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deck_id, movie_id)
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_items ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para 'decks'
DROP POLICY IF EXISTS "Users can view their own decks" ON public.decks;
CREATE POLICY "Users can view their own decks"
    ON public.decks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own decks" ON public.decks;
CREATE POLICY "Users can insert their own decks"
    ON public.decks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own decks" ON public.decks;
CREATE POLICY "Users can update their own decks"
    ON public.decks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own decks" ON public.decks;
CREATE POLICY "Users can delete their own decks"
    ON public.decks FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Crear políticas RLS para 'deck_items'
DROP POLICY IF EXISTS "Users can view deck items of their own decks" ON public.deck_items;
CREATE POLICY "Users can view deck items of their own decks"
    ON public.deck_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = deck_items.deck_id
            AND decks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert deck items to their own decks" ON public.deck_items;
CREATE POLICY "Users can insert deck items to their own decks"
    ON public.deck_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = deck_items.deck_id
            AND decks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete deck items from their own decks" ON public.deck_items;
CREATE POLICY "Users can delete deck items from their own decks"
    ON public.deck_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.decks
            WHERE decks.id = deck_items.deck_id
            AND decks.user_id = auth.uid()
        )
    );

-- 6. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON public.decks(created_at);
CREATE INDEX IF NOT EXISTS idx_deck_items_deck_id ON public.deck_items(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_items_movie_id ON public.deck_items(movie_id);

-- 7. Asegurar que las columnas description y tags existen
DO $$ 
BEGIN
    -- Agregar description si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.decks ADD COLUMN description TEXT;
    END IF;
    
    -- Agregar tags si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.decks ADD COLUMN tags TEXT[];
    END IF;
    
    -- Asegurar que updated_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.decks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 8. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar que la columna existe antes de actualizarla
    IF TG_TABLE_NAME = 'decks' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_decks_updated_at ON public.decks;
CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*) -- Solo ejecutar si hay cambios reales
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Verificación final: eliminar columna 'name' si existe (ya migrada a 'title')
DO $$ 
BEGIN
    -- Si existe 'name' y también existe 'title', eliminar 'name' (ya migrada)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'decks' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.decks DROP COLUMN name;
    END IF;
END $$;
