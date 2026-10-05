/**
 * Tipos compartidos de CineMatch — fuente única de verdad.
 * Dominio (Movie, Deck…), filas de Supabase (*Row) y respuestas de TMDB (TMDB*).
 */

// ---------------------------------------------------------------------------
// Dominio
// ---------------------------------------------------------------------------

export type ContentType = 'movie' | 'tv';
export type Privacy = 'private' | 'friends' | 'public';
export type AppLanguage = 'es' | 'en';

export interface WatchProvider {
    name: string;
    link: string;
}

export interface Movie {
    /** ID de TMDB como string */
    id: string;
    type: ContentType;
    title: string;
    /** 0 cuando TMDB no tiene fecha */
    year: number;
    /** 0-10 */
    rating: number;
    /** URL completa del póster ('' si no hay) */
    image: string;
    synopsis: string;
    genres: string[];
    providerName?: string;
    watchLink?: string;
    providers?: WatchProvider[];
    /** Campos legacy que pueden venir en datos antiguos guardados en user_library */
    title_es?: string;
    synopsis_es?: string;
}

export type LibraryMovie = Movie & { added_at?: string };

/** Referencia ligera a un título dentro de una baraja */
export interface DeckItemRef {
    id: string;
    type: ContentType;
}

export interface Deck {
    id: string;
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
    title: string;
    description: string;
    /** Todos los títulos de la baraja (siempre completo) */
    items: DeckItemRef[];
    /**
     * Películas con detalles. En los listados solo trae las primeras (portadas);
     * `moviesLoaded` indica si ya están todas (ver hydrateDeck en DeckContext).
     */
    movies: Movie[];
    moviesLoaded: boolean;
    isPublic: boolean;
    tags: string[];
    privacy: Privacy;
    views: number;
}

export interface Profile {
    id: string;
    username: string | null;
    avatar_url: string | null;
    level: number;
    is_premium: boolean;
    preferred_genres?: string[] | null;
    preferred_platforms?: string[] | null;
    preferred_content_types?: ContentType[] | null;
    updated_at?: string;
}

export type ProfileSummary = Pick<Profile, 'id' | 'username' | 'avatar_url'> & { level?: number };

/** Amigo = perfil + id de la fila de amistad (para poder eliminarla) */
export type Friend = ProfileSummary & { friendshipId: string };

export interface FriendRequest {
    id: string;
    requester: ProfileSummary;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Ruleta / lobby
// ---------------------------------------------------------------------------

export type RouletteMediaType = ContentType | 'both';
export type RouletteSourceType = 'trending' | 'genre' | 'deck' | 'surprise';

export interface RouletteConfig {
    mediaType: RouletteMediaType;
    sourceType: RouletteSourceType;
    /** IDs de género TMDB separados por coma (sourceType 'genre') o ID de baraja ('deck') */
    sourceValue: string;
    /** IDs de proveedor TMDB; vacío = cualquier plataforma */
    providers: string[];
    minRating: number;
}

export type LobbyStatus = 'waiting' | 'swiping' | 'spinning' | 'finished';

/**
 * Estado compartido de una partida de ruleta (columna `config` de roulette_lobbies).
 * Solo lo escribe el anfitrión; todos los jugadores derivan su pantalla de aquí.
 */
export interface LobbyConfig {
    rouletteConfig: RouletteConfig;
    /** Baraja de la ronda actual */
    roundMovies?: Movie[] | null;
    /** Epoch ms en que termina la ronda de swipe (mismo reloj para todos) */
    roundEndsAt?: number | null;
    /** La ronda terminó sin ninguna película en común */
    noMatch?: boolean;
    /** Películas que han gustado a todos que entran en la ruleta (máximo MAX_WHEEL_SLOTS) */
    winningMatches?: Movie[] | null;
    /** Total de coincidencias de la ronda (puede ser mayor que los gajos) */
    matchCount?: number | null;
    /** Giro final de la ruleta (grados) y película ganadora */
    spinRotation?: number | null;
    winnerId?: string | null;
}

export interface Player {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
}

// ---------------------------------------------------------------------------
// Filas de Supabase
// ---------------------------------------------------------------------------

export interface DeckRow {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    tags: string[] | null;
    privacy: Privacy | null;
    views: number | null;
    created_at: string;
}

export interface DeckItemRow {
    movie_id: number;
    media_type: ContentType | null;
}

export type DeckWithItems = DeckRow & { deck_items: DeckItemRow[] | null };

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface FriendshipRow {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: FriendshipStatus;
    created_at: string;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ChallengeRow {
    id: string;
    sender_id: string;
    receiver_id: string;
    movie_id: number;
    movie_title: string;
    movie_image: string | null;
    movie_year: number | null;
    /** NUMERIC(3,1): PostgREST puede devolverlo como string */
    movie_rating: number | string | null;
    movie_type: ContentType | null;
    status: ChallengeStatus;
    created_at: string;
}

export interface UserLibraryRow {
    movie_id: string;
    movie_data: LibraryMovie;
    added_at: string;
}

export interface RouletteLobbyRow {
    id: string;
    code: string;
    host_id: string;
    config: LobbyConfig | null;
    status: LobbyStatus;
}

export interface LobbyMemberRow {
    user_id: string;
    role: 'host' | 'guest';
    profiles: ProfileSummary | null;
}

export interface RouletteInvitationRow {
    id: string;
    lobby_id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    created_at: string;
}

// ---------------------------------------------------------------------------
// TMDB
// ---------------------------------------------------------------------------

export interface TMDBListItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    genre_ids?: number[];
}

export interface TMDBGenre {
    id: number;
    name: string;
}

export interface TMDBCredits {
    cast?: { name: string; character?: string }[];
    crew?: { name: string; job: string }[];
}

export interface TMDBDetails extends Omit<TMDBListItem, 'genre_ids'> {
    genres?: TMDBGenre[];
    runtime?: number;
    episode_run_time?: number[];
    number_of_seasons?: number;
    tagline?: string;
    created_by?: { name: string }[];
    production_companies?: { name: string }[];
    seasons?: { season_number: number; episode_count: number }[];
    credits?: TMDBCredits;
}

export interface TMDBPaged<T> {
    page: number;
    results: T[];
    total_pages: number;
}

export interface TMDBWatchProvider {
    provider_id: number;
    provider_name: string;
}

export interface TMDBWatchProvidersResponse {
    results?: Record<string, { link?: string; flatrate?: TMDBWatchProvider[] }>;
}
