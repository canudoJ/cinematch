-- Script para crear/verificar la estructura correcta de la tabla 'challenges'
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla 'challenges' si no existe
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    movie_title TEXT NOT NULL,
    movie_image TEXT,
    movie_year INTEGER,
    movie_rating NUMERIC(3,1),
    movie_type TEXT DEFAULT 'movie',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (sender_id != receiver_id)
);

-- 1.1. Añadir columnas si no existen (para tablas ya creadas)
DO $$ 
BEGIN
    -- Añadir movie_year si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'challenges' 
        AND column_name = 'movie_year'
    ) THEN
        ALTER TABLE public.challenges ADD COLUMN movie_year INTEGER;
    END IF;
    
    -- Añadir movie_rating si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'challenges' 
        AND column_name = 'movie_rating'
    ) THEN
        ALTER TABLE public.challenges ADD COLUMN movie_rating NUMERIC(3,1);
    END IF;
    
    -- Añadir movie_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'challenges' 
        AND column_name = 'movie_type'
    ) THEN
        ALTER TABLE public.challenges ADD COLUMN movie_type TEXT DEFAULT 'movie';
    END IF;
END $$;

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can update received challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenges;

-- 4. Crear políticas RLS para 'challenges'

-- SELECT: Usuarios pueden ver retos enviados o recibidos
CREATE POLICY "Users can view their own challenges"
    ON public.challenges FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: Usuarios pueden crear retos donde son sender
CREATE POLICY "Users can create challenges"
    ON public.challenges FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Usuarios pueden aceptar/rechazar retos donde son receiver
CREATE POLICY "Users can update received challenges"
    ON public.challenges FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- DELETE: Usuarios pueden eliminar sus propios retos (sender o receiver)
CREATE POLICY "Users can delete their own challenges"
    ON public.challenges FOR DELETE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_challenges_sender_id ON public.challenges(sender_id);
CREATE INDEX IF NOT EXISTS idx_challenges_receiver_id ON public.challenges(receiver_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges(created_at);

-- 6. Verificar que la tabla se creó correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challenges') THEN
        RAISE NOTICE 'Tabla challenges creada/verificada correctamente';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo crear la tabla challenges';
    END IF;
END $$;
