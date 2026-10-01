-- Script para crear/verificar la estructura correcta de las tablas 'friendships' y 'challenges'
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear la tabla 'friendships' si no existe
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id),
    CHECK (requester_id != receiver_id)
);

-- 2. Crear la tabla 'challenges' si no existe
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL,
    movie_title TEXT NOT NULL,
    movie_image TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (sender_id != receiver_id)
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para 'friendships'

-- SELECT: Usuarios pueden ver sus propias amistades (donde son requester o receiver)
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- INSERT: Usuarios pueden crear solicitudes donde son requester
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
CREATE POLICY "Users can create friendship requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- UPDATE: Usuarios pueden aceptar/rechazar solicitudes donde son receiver
DROP POLICY IF EXISTS "Users can update received requests" ON public.friendships;
CREATE POLICY "Users can update received requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- DELETE: Usuarios pueden eliminar sus propias amistades (requester o receiver)
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;
CREATE POLICY "Users can delete their own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 5. Crear políticas RLS para 'challenges'

-- SELECT: Usuarios pueden ver retos enviados o recibidos
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenges;
CREATE POLICY "Users can view their own challenges"
    ON public.challenges FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: Usuarios pueden crear retos donde son sender
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
CREATE POLICY "Users can create challenges"
    ON public.challenges FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Usuarios pueden aceptar/rechazar retos donde son receiver
DROP POLICY IF EXISTS "Users can update received challenges" ON public.challenges;
CREATE POLICY "Users can update received challenges"
    ON public.challenges FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- DELETE: Usuarios pueden eliminar sus propios retos (sender o receiver)
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenges;
CREATE POLICY "Users can delete their own challenges"
    ON public.challenges FOR DELETE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 6. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver_id ON public.friendships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON public.friendships(created_at);

CREATE INDEX IF NOT EXISTS idx_challenges_sender_id ON public.challenges(sender_id);
CREATE INDEX IF NOT EXISTS idx_challenges_receiver_id ON public.challenges(receiver_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges(created_at);

-- 7. Crear función para actualizar updated_at automáticamente en friendships
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para actualizar updated_at en friendships
DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON public.friendships
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_friendships_updated_at();
