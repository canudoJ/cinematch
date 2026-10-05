/** Fondo y contenedor comunes de todas las pantallas de acceso */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-[var(--background)] p-4 text-[var(--foreground)]">
            <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-[var(--primary)] opacity-5 blur-[120px]" aria-hidden />
            <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-[var(--primary)] opacity-10 blur-[100px]" aria-hidden />
            <div className="relative z-10 w-full max-w-md py-8 animate-fade-in">{children}</div>
        </div>
    );
}
