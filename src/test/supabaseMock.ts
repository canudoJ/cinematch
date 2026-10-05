/**
 * Mock mínimo del cliente de Supabase para tests.
 * Cada llamada a `from(tabla)` devuelve un query builder encadenable que,
 * al hacer `await`, resuelve con la respuesta configurada para esa tabla.
 *
 *   const mock = createSupabaseMock({ profiles: { data: [...], error: null } });
 *   jest.mock('@/lib/supabase', () => ({ supabase: mock.client }));
 */
export interface MockResponse {
    data?: unknown;
    error?: { message: string; code?: string } | null;
    count?: number | null;
}

type Calls = { table: string; method: string; args: unknown[] }[];

export function createSupabaseMock(responses: Record<string, MockResponse | MockResponse[]> = {}) {
    const calls: Calls = [];
    const counters: Record<string, number> = {};

    const nextResponse = (table: string): MockResponse => {
        const configured = responses[table] ?? { data: null, error: null };
        if (!Array.isArray(configured)) return configured;
        const index = counters[table] = (counters[table] ?? -1) + 1;
        return configured[Math.min(index, configured.length - 1)];
    };

    const builder = (table: string) => {
        const response = nextResponse(table);
        const proxy: Record<string, unknown> = new Proxy({}, {
            get(_, prop: string) {
                if (prop === 'then') {
                    return (resolve: (value: MockResponse) => unknown) =>
                        resolve({ data: response.data ?? null, error: response.error ?? null, count: response.count ?? null });
                }
                return (...args: unknown[]) => {
                    calls.push({ table, method: prop, args });
                    return proxy;
                };
            },
        });
        return proxy;
    };

    const client = {
        from: (table: string) => {
            calls.push({ table, method: 'from', args: [] });
            return builder(table);
        },
        rpc: (fn: string, args: unknown) => {
            calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] });
            return Promise.resolve(nextResponse(`rpc:${fn}`));
        },
    };

    return { client, calls };
}
