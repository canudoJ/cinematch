# “˜ Manual Tecnico - CineMatch

## Indice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Stack Tecnologico](#stack-tecnoligico)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Arquitectura Frontend](#arquitectura-frontend)
5. [APIs y Servicios](#apis-y-servicios)
6. [Seguridad](#seguridad)
7. [Patrones de Diseño](#patrones-de-diseño)
8. [Configuración y Despliegue](#configuracion-y-despliegue)

---

## Arquitectura del Sistema

### Diagrama de Arquitectura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Usuario       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚      Next.js Frontend (React)       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   Context API (Estado Global) â”‚  â”‚
â”‚  â”‚   - AuthProvider               â”‚  â”‚
â”‚  â”‚   - UserProvider               â”‚  â”‚
â”‚  â”‚   - DeckContext                â”‚  â”‚
â”‚  â”‚   - ChallengeContext           â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         Supabase Backend             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   PostgreSQL Database          â”‚  â”‚
â”‚  â”‚   - profiles                   â”‚  â”‚
â”‚  â”‚   - decks / deck_items         â”‚  â”‚
â”‚  â”‚   - friendships               â”‚  â”‚
â”‚  â”‚   - challenges                 â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚   Authentication              â”‚  â”‚
â”‚  â”‚   Storage (Avatares)           â”‚  â”‚
â”‚  â”‚   Row Level Security (RLS)    â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚      TMDB API (Externa)             â”‚
â”‚   - Peli­culas y Series              â”‚
â”‚   - Información de Streaming        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Flujo de Datos

1. **Autenticación**: Usuario se autentifica’ Supabase Auth ’ Token JWT
2. **Peticiones**: Frontend ’ Supabase Client ’ PostgreSQL (con RLS)
3. **Datos Externos**: Frontend ’ TMDB API ’ Datos de peliculas

---

## Stack Tecnolígico

### Frontend

#### Next.js 16 (App Router)
- **Framework**: React con App Router
- **Routing**: File-based routing
- **SSR/SSG**: Server-side rendering cuando necesario
- **API Routes**: No utilizadas (todo cliente-side)

#### React 19
- **Hooks**: useState, useEffect, useContext, useCallback
- **Context API**: Para estado global
- **Componentes**: Funcionales con TypeScript

#### TypeScript
- **Tipado estático**: Todas las interfaces y tipos definidos
- **Type Safety**: Previene errores en tiempo de desarrollo

#### Tailwind CSS
- **Utility-first**: Estilos inline con clases
- **Responsive**: Diseño mobile-first
- **Custom Properties**: Variables CSS para temas

### Backend

#### Supabase
- **PostgreSQL**: Base de datos relacional
- **Auth**: Autenticacion con JWT
- **RLS**: Row Level Security para seguridad
- **Storage**: Almacenamiento de avatares
- **Realtime**: No utilizado (preparado para futuro)

### APIs Externas

#### The Movie Database (TMDB)
- **Endpoint**: `https://api.themoviedb.org/3`
- **Autenticación**: API Key
- **Endpoints utilizados**:
  - `/search/multi` - Búsqueda
  - `/movie/{id}` - Detalles de pelí­cula
  - `/tv/{id}` - Detalles de serie
  - `/movie/{id}/watch/providers` - Plataformas de streaming

---

## Estructura de Base de Datos

### Tabla: `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  is_premium BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Polí­ticas RLS**:
- SELECT: Todos pueden ver perfiles pÃºblicos
- INSERT: Solo el propio usuario puede crear su perfil
- UPDATE: Solo el propio usuario puede actualizar su perfil

### Tabla: `decks`

```sql
CREATE TABLE decks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Relaciones**:
- `user_id` â†’ `auth.users(id)` (CASCADE DELETE)

### Tabla: `deck_items`

```sql
CREATE TABLE deck_items (
  id UUID PRIMARY KEY,
  deck_id UUID REFERENCES decks(id),
  movie_id INTEGER NOT NULL,
  media_type TEXT DEFAULT 'movie',
  added_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(deck_id, movie_id)
);
```

### Tabla: `friendships`

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);
```

**Estados**:
- `pending`: Solicitud pendiente
- `accepted`: Amistad aceptada
- `declined`: Solicitud rechazada

### Tabla: `challenges`

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES auth.users(id),
  movie_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_image TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE,
  CHECK (sender_id != receiver_id)
);
```

### Ãndices

```sql
-- OptimizaciÃ³n de consultas frecuentes
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX idx_friendships_receiver_id ON friendships(receiver_id);
CREATE INDEX idx_challenges_receiver_id ON challenges(receiver_id);
```

---

## Arquitectura Frontend

### Estructura de Carpetas

```
src/
â”œâ”€â”€ app/                    # Páginas (App Router)
â”‚   â”œâ”€â”€ page.tsx           # Home
â”‚   â”œâ”€â”€ auth/              # Autenticación
â”‚   â”œâ”€â”€ profile/           # Perfil
â”‚   â””â”€â”€ challenge-mode/    # Retos
â”œâ”€â”€ components/            # Componentes reutilizables
â”‚   â”œâ”€â”€ SwipeDeck.tsx     # Componente principal de swipe
â”‚   â”œâ”€â”€ MovieCard.tsx     # Tarjeta de pelí­cula
â”‚   â””â”€â”€ ...
â”œâ”€â”€ context/              # Context API
â”‚   â”œâ”€â”€ AuthProvider.tsx  # Autenticación global
â”‚   â”œâ”€â”€ UserContext.tsx   # Preferencias usuario
â”‚   â”œâ”€â”€ DeckContext.tsx  # Gestión de decks
â”‚   â””â”€â”€ ChallengeContext.tsx # Retos
â”œâ”€â”€ hooks/                # Custom hooks
â”‚   â””â”€â”€ useFriends.ts    # Lógica de amigos
â”œâ”€â”€ lib/                  # Utilidades
â”‚   â”œâ”€â”€ supabase.ts      # Cliente Supabase (Singleton)
â”‚   â””â”€â”€ data.ts          # Tipos y constantes
â””â”€â”€ services/            # Servicios externos
    â””â”€â”€ tmdb.ts          # Cliente TMDB API
```

### Context API (Estado Global)

#### AuthProvider
- **Propósito**: Gestionar autenticación y sesión
- **Estado**: `user`, `profile`, `loading`
- **Métodos**: `signIn`, `signOut`, `updateProfile`

#### UserContext
- **Propósito**: Preferencias del usuario
- **Estado**: `platforms`, `contentTypes`, `likedContent`
- **Almacenamiento**: localStorage

#### DeckContext
- **Propósito**: GestiÃ³n de decks
- **Estado**: `decks`, `activeDeck`
- **MÃ©todos**: `fetchDecks`, `saveDeck`, `deleteDeck`

#### ChallengeContext
- **Propósito**: Sistema de retos
- **Estado**: `pendingChallenges`, `sentChallenges`
- **MÃ©todos**: `sendChallenge`, `resolveChallenge`

### Patrón Singleton

**Implementación en `src/lib/supabase.ts`**:

```typescript
import { createBrowserClient } from '@/utils/supabase/client';

// Singleton instance
export const supabase = createBrowserClient();
```

**Uso en toda la aplicación**:
```typescript
import { supabase } from '@/lib/supabase';
// Siempre la misma instancia
```

---

## APIs y Servicios

### Cliente Supabase

**Configuración**:
```typescript
// src/utils/supabase/client.ts
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Uso**:
```typescript
// Consultas con RLS automÃ¡tico
const { data } = await supabase
  .from('decks')
  .select('*')
  .eq('user_id', user.id);
```

### Cliente TMDB

**Configuración**:
```typescript
// src/services/tmdb.ts
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
```

**Endpoints utilizados**:
- `searchContent(query)`: Búsqueda de pelí­culas/series
- `fetchDetails(id, type)`: Detalles completos
- `getWatchLink(id, type)`: Enlaces de streaming

---

## Seguridad

### Row Level Security (RLS)

**Principio**: Cada usuario solo puede acceder a sus propios datos

**Ejemplo - Decks**:
```sql
CREATE POLICY "Users can view their own decks"
  ON decks FOR SELECT
  USING (auth.uid() = user_id);
```

**Ejemplo - Friendships**:
```sql
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
```

### AutenticaciÃ³n

- **JWT Tokens**: Supabase gestiona tokens automÃ¡ticamente
- **Middleware**: ProtecciÃ³n de rutas en `middleware.ts`
- **ValidaciÃ³n**: VerificaciÃ³n de sesiÃ³n en cada peticiÃ³n

### Validaciones Cliente

- Verificación de usuario autenticado antes de operaciones
- Validacion de datos antes de insertar/actualizar
- Manejo de errores con mensajes claros

---

## Patrones de Diseño

### 1. Singleton Pattern
- **Uso**: Cliente Supabase
- **Beneficio**: Una sola instancia, mejor rendimiento

### 2. Context API Pattern
- **Uso**: Estado global compartido
- **Beneficio**: Evita prop drilling

### 3. Custom Hooks Pattern
- **Uso**: `useFriends`, lógica reutilizable
- **Beneficio**: Separación de lógica y presentación

### 4. Component Composition
- **Uso**: Componentes pequeños y reutilizables
- **Beneficio**: Mantenibilidad

---

## Configuración y Despliegue

### Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_TMDB_API_KEY=xxx
```

### Scripts SQL

Ejecutar en orden:
1. `fix_profile_rls.sql` - Perfiles y autenticaciÃ³n
2. `fix_decks_schema.sql` - Decks y items
3. `fix_friendships_schema.sql` - Amistades y retos

### Build y Deploy

```bash
# Build de producciÃ³n
npm run build

# Iniciar servidor de producciÃ³n
npm start
```

### Consideraciones de Despliegue

- **Vercel**: Recomendado para Next.js
- **Netlify**: Alternativa
- **Variables de entorno**: Configurar en plataforma
- **Base de datos**: Supabase (cloud)

---

## Mejoras Futuras

- [ ] Notificaciones en tiempo real (Supabase Realtime)
- [ ] Sistema de chat entre amigos
- [ ] Recomendaciones basadas en ML
- [ ] App móvil (React Native)
- [ ] Tests unitarios y E2E
- [ ] PWA (Progressive Web App)

---

**Documentación técnica actualizada: Enero 2026**
