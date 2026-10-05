import { genreName } from '@/lib/movies';

const PINK = 'var(--media-pink)';
const CYAN = 'var(--media-cyan)';
const VIOLET = 'var(--media-violet)';
const AMBER = 'var(--media-amber)';
const GREEN = 'var(--media-green)';
const ORANGE = 'var(--media-orange)';

/** Color de cada género de TMDB (películas y series), elegido por lo que evoca */
const ACCENT_BY_GENRE_ID: Record<number, string> = {
    28: ORANGE, // Acción
    12: GREEN, // Aventura
    16: CYAN, // Animación
    35: AMBER, // Comedia
    80: VIOLET, // Crimen
    99: GREEN, // Documental
    18: VIOLET, // Drama
    10751: AMBER, // Familiar
    14: VIOLET, // Fantasía
    36: AMBER, // Historia
    27: PINK, // Terror
    10402: PINK, // Música
    9648: VIOLET, // Misterio
    10749: PINK, // Romance
    878: CYAN, // Ciencia ficción
    10770: CYAN, // Película de TV
    53: ORANGE, // Suspense
    10752: ORANGE, // Guerra
    37: AMBER, // Western
    10759: ORANGE, // Acción y aventura
    10762: CYAN, // Infantil
    10763: GREEN, // Noticias
    10764: AMBER, // Reality
    10765: CYAN, // Ciencia ficción y fantasía
    10766: PINK, // Telenovela
    10767: GREEN, // Talk show
    10768: ORANGE, // Bélica y política
};

/** Las películas guardan el nombre del género ya traducido: se busca en ambos idiomas */
const ACCENT_BY_NAME = new Map<string, string>(
    Object.entries(ACCENT_BY_GENRE_ID).flatMap(([id, accent]) =>
        (['es', 'en'] as const).map(lang => [genreName(Number(id), lang).toLowerCase(), accent] as [string, string]),
    ),
);

const FALLBACK = [PINK, CYAN, VIOLET, AMBER, GREEN, ORANGE];

/** Color de la etiqueta de un género; uno desconocido recibe siempre el mismo color por su nombre */
export function genreAccent(genre: string): string {
    const key = genre.toLowerCase();
    const known = ACCENT_BY_NAME.get(key);
    if (known) return known;
    let hash = 0;
    for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return FALLBACK[hash % FALLBACK.length];
}
