# 🎬 CineMatch

**Plataforma social para decidir qué película o serie ver, solo o con amigos.**

CineMatch resuelve el clásico "¿qué vemos esta noche?". En lugar de navegar listas interminables, deslizas tarjetas estilo Tinder filtradas por tus plataformas de streaming y géneros favoritos, retas a tus amigos con recomendaciones y montáis una sesión en tiempo real para encontrar una película que os guste a todos.

> Proyecto final de Grado Superior desarrollado por **Javier Canudo Tavara**.

**Demo privada:** https://cinematch-demo.vercel.app (se accede con la contraseña facilitada). Dentro, pulsa **"Probar sin registrarse"** para entrar como invitado, sin email ni contraseña: la cuenta de invitado llega con un amigo (`cinematch`), un reto pendiente y barajas públicas para jugar.

---

## ✨ Funcionalidades

| Área | Qué hace |
|---|---|
| **Swipe feed** | Tarjetas con swipe táctil, ratón o teclado; contenido de TMDB filtrado por plataforma (Netflix, Prime Video, Disney+, HBO Max, Crunchyroll…), tipo y género. Sin repeticiones dentro de la sesión. |
| **Videoteca** | Los "likes" se guardan con enlace directo a la ficha del título en la plataforma (vía JustWatch), filtros y orden. |
| **Barajas** | Colecciones curadas con etiquetas y privacidad (privada / amigos / pública), compartibles por URL. Al terminar una baraja, torneo por eliminación entre las elegidas. |
| **Social** | Búsqueda de usuarios, solicitudes de amistad y enlaces de invitación, actualizados en **tiempo real**. |
| **Retos** | Envía una película a un amigo: le aparece sobre su feed para aceptarla o rechazarla. |
| **CineRuleta (multijugador)** | Sala en tiempo real con código de 6 caracteres: todos hacen swipe a la vez durante 60 s, la app calcula las coincidencias unánimes y una ruleta sincronizada elige la ganadora. |
| **Test de afinidad** | Quiz de 5 preguntas que genera una baraja temporal personalizada. |
| **Modo invitado** | Usuario anónimo de Supabase con todas las funciones; puede convertirse en cuenta normal sin perder sus datos. |
| **Extras** | Tema claro/oscuro, español/inglés, diseño mobile-first, accesible por teclado y con lector de pantalla, instalable como web app. |

## 🛠️ Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind CSS
- **Backend (BaaS):** Supabase — PostgreSQL con Row Level Security, Auth (incluido anónimo), Realtime, Storage
- **APIs externas:** TMDB v3 (catálogo) y JustWatch GraphQL (enlaces de streaming), ambas a través de proxies en el servidor
- **Testing:** Jest + React Testing Library + user-event
- **Despliegue:** Vercel

## 🏗️ Arquitectura

```
src/
├── app/              Rutas (App Router)
│   └── api/          Proxies de servidor: /api/tmdb/[...path] y /api/justwatch
├── components/       Pantallas y modales por dominio (decks/, roulette/, profile/, auth/…)
│   └── ui/           Primitivas propias: ModalShell, ConfirmDialog, Tabs, Toast, Poster…
├── context/          Estado global por dominio (Auth, User, Friends, Deck, Challenge, Lobby…)
├── hooks/            Lógica reutilizable de UI (useRouletteGame, useMovieDetails, useCountdown…)
├── services/         Cliente TMDB (caché, límite de concurrencia) y enlaces de streaming
├── lib/              Lógica pura y testeada: ruleta, torneo, proveedores, región, almacenamiento…
├── i18n/             Traducciones (es.ts es la fuente; en.ts está tipado contra ella)
├── types/            Tipos de dominio, filas de la base de datos y respuestas de TMDB
└── proxy.ts          Refresco de sesión y protección de rutas privadas
supabase/migrations/  Esquema SQL, políticas RLS, RPCs y datos de demostración
```

Decisiones destacadas:

- **La clave de TMDB nunca llega al navegador.** El cliente llama a `/api/tmdb`, que solo admite una lista blanca de endpoints y parámetros, añade la clave en el servidor y cachea las respuestas.
- **Row Level Security en todas las tablas.** Cada usuario solo lee y escribe lo suyo; las barajas "amigos" se validan contra `friendships`, y los miembros de una sala se comprueban con funciones `SECURITY DEFINER` para evitar recursión en las políticas.
- **Realtime en lugar de polling** para retos, amistades, invitaciones y la sala de la ruleta. El estado de la partida (fase, ronda, giro, ganadora) vive en la base de datos y cada cliente lo deriva, así todos ven lo mismo.
- **Lógica de negocio pura en `src/lib`**, separada de React y cubierta por tests (cobertura superior al 80 %).
- **Demo privada sin servicios de pago:** con `SITE_PASSWORD`, el proxy de Next exige una cookie `httpOnly` que guarda un HMAC de la contraseña (nunca la contraseña). Cambiarla invalida todos los accesos; la web además pide no ser indexada.
- **Accesibilidad:** diálogos con trampa de foco y Escape, pestañas con flechas, avisos en regiones `aria-live` y `prefers-reduced-motion`.

## 🚀 Ejecutar en local

```bash
git clone https://github.com/canudoJ/cinematch.git
cd cinematch
npm install
cp .env.example .env.local   # rellena las claves de Supabase y TMDB
npm run dev
```

Variables de entorno (ver `.env.example`):

| Variable | Dónde se usa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador y servidor (la seguridad la dan las políticas RLS) |
| `TMDB_API_KEY` | Solo servidor, en el proxy `/api/tmdb` |
| `SITE_PASSWORD` | Opcional. Si existe, toda la web (páginas y API) pide esa contraseña antes de entrar |

Base de datos: en el SQL Editor de Supabase, ejecuta los scripts de `supabase/migrations/` en este orden:

1. Los `fix_*.sql` (esquema y políticas de cada tabla).
2. `quality_pass.sql` (políticas de la ruleta, RPCs e índices).
3. `demo_guest_mode.sql` (opcional: barajas oficiales y bienvenida al invitado). Requiere activar *Anonymous sign-ins* en Supabase Auth y una cuenta con el usuario `cinematch`.

## 🧪 Calidad

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, build de producción y servidor |
| `npm run lint` | ESLint con las reglas de Next y React Compiler (0 errores, 0 avisos) |
| `npm test` | 161 tests: lógica pura, proxies de API, acceso privado y componentes |
| `npm run test:coverage` | Cobertura de `src/lib` (mínimo 80 % exigido en la configuración) |

## 🗺️ Próximos pasos

- Tests end-to-end con Playwright de la ruleta entre dos navegadores
- Notificaciones push para retos e invitaciones
- Generación de tipos de la base de datos con `supabase gen types`

---

Desarrollado por **Javier Canudo Tavara** · Datos de películas por [TMDB](https://www.themoviedb.org/) (este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB) · Enlaces de streaming por [JustWatch](https://www.justwatch.com/).
