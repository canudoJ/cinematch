import '@testing-library/jest-dom';

// Valores ficticios: los tests nunca hablan con Supabase real (ver src/test/supabaseMock.ts)
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// next/image necesita el servidor de Next para optimizar: en tests basta un <img> normal
const NEXT_ONLY_IMAGE_PROPS = new Set(['fill', 'priority', 'sizes']);

jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
        const imgProps = Object.fromEntries(Object.entries(props).filter(([key]) => !NEXT_ONLY_IMAGE_PROPS.has(key)));
        return jest.requireActual<typeof import('react')>('react').createElement('img', imgProps);
    },
}));
