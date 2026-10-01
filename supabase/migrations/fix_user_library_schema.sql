-- Crear tabla user_library
CREATE TABLE IF NOT EXISTS user_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id TEXT NOT NULL,
    movie_data JSONB NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_movie_id ON user_library(movie_id);

-- RLS Policies
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own library"
    ON user_library FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own library"
    ON user_library FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own library"
    ON user_library FOR DELETE
    USING (auth.uid() = user_id);

-- Añadir columna preferred_genres a profiles si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'preferred_genres'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferred_genres JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
