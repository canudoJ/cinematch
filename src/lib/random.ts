/** Barajado Fisher-Yates sin sesgo. Devuelve una copia: no muta el array original. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** Sin caracteres ambiguos (0/O, 1/I/L) para que el código se pueda dictar */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código aleatorio de longitud fija, criptográficamente seguro */
export function randomCode(length = 6): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Elige `count` elementos distintos al azar */
export function sample<T>(items: readonly T[], count: number): T[] {
    return shuffle(items).slice(0, count);
}
