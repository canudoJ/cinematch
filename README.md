# 🎬 CineMatch

**Plataforma social para decidir qué película o serie ver, solo o con amigos.**

CineMatch resuelve el clásico "¿qué vemos esta noche?". En lugar de navegar listas interminables, deslizas tarjetas estilo Tinder filtradas por tus plataformas de streaming y géneros favoritos, retas a tus amigos con recomendaciones y montáis una sesión en tiempo real para encontrar una película que os guste a todos.

> Proyecto final de Grado Superior desarrollado por **Javier Canudo Tavara**.

---

## ✨ Funcionalidades

| Área | Qué hace |
|---|---|
| **Swipe feed** | Tarjetas con swipe táctil/ratón; contenido de TMDB filtrado por plataforma (Netflix, Prime Video, Disney+, Max, Crunchyroll), tipo y género. Sin repeticiones dentro de la sesión. |
| **Biblioteca** | Los "likes" se guardan con enlace directo a la plataforma donde verlos (vía JustWatch). |
| **Barajas (decks)** | CRUD de colecciones curadas con tags y privacidad (privada / amigos / pública). Compartibles por URL. |
| **Social** | Búsqueda de usuarios, solicitudes de amistad, enlaces de invitación. Actualización en **tiempo real**. |
| **Retos** | Envía una película a un amigo; le aparece como overlay en su feed para aceptarla o rechazarla. |
| **Ruleta multijugador** | Lobby en tiempo real con temporizador: varios usuarios hacen swipe a la vez y la app detecta los matches. |
| **Test de afinidad** | Quiz de 5 preguntas que genera una baraja temporal personalizada. |
| **Extras** | Tema claro/oscuro, español/inglés, diseño mobile-first con manifest web app. |

## 🛠️ Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend (BaaS):** Supabase — PostgreSQL, Auth (JWT), Realtime (WebSockets), Storage
- **APIs externas:** TMDB v3 (catálogo) y JustWatch GraphQL (enlaces de streaming, vía proxy server-side)
- **Testing:** Jest + React Testing Library
- **Despliegue:** Vercel

## 🏗️ Arquitectura

```
src/
├── app/            Rutas (App Router) + route handler /api/justwatch
├── components/     UI: SwipeDeck, MovieCard, modales, layout, primitivas ui/
├── context/        Estado global por dominio (Auth, User, Deck, Challenge, Lobby, i18n, Theme…)
├── hooks/          useFriends (Realtime)
├── services/       Cliente TMDB + resolución de enlaces de streaming
├── lib/            Tipos de dominio, constantes, cliente Supabase singleton
└── utils/supabase/ Clientes browser/server y refresco de sesión en middleware
supabase/migrations/  Esquema SQL y políticas Row Level Security
```

Decisiones destacadas:

- **Row Level Security** en todas las tablas: cada usuario solo lee/escribe lo suyo; las barajas "amigos" se validan contra la tabla `friendships`.
- **Realtime en lugar de polling** para retos, amistades y lobby.
- **Preferencias optimistas:** se leen primero de `localStorage` (UI instantánea) y Supabase actúa como fuente de verdad.
- **Proxy server-side para JustWatch**, que no permite CORS desde el navegador, con fallback a la búsqueda de la plataforma.

## 🚀 Ejecutar en local

```bash
git clone https://github.com/canudoJ/cinematch.git
cd cinematch
npm install
cp .env.example .env.local   # rellena las claves de Supabase y TMDB
npm run dev
```

Scripts: `npm run dev` · `npm run build` · `npm run lint` · `npm test`

Para la base de datos, ejecuta los scripts de `supabase/migrations/` en el SQL Editor de tu proyecto Supabase.

## 🗺️ Próximos pasos

- Refactorizar el lobby de ruleta en hooks y subcomponentes
- Tipado estricto (eliminar `any` restantes) y más cobertura de tests
- Notificaciones push y estadísticas personales

---

Desarrollado por **Javier Canudo Tavara** · Datos de películas por [TMDB](https://www.themoviedb.org/) (este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB).
