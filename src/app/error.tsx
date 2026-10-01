"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Boundary global de errores para mostrar una pantalla amigable
 * en lugar de pantallas en blanco o crashes feos de React.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  console.error("App error boundary:", error);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[var(--card)]/90 border border-[var(--secondary)]/60 rounded-3xl p-6 shadow-[var(--shadow-neon-cyan)] text-center">
        <h1 className="heading-lg mb-3 text-[var(--secondary)]">
          Algo salió mal
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Ha ocurrido un error inesperado mientras cargábamos la página.
          Puedes intentar recargar la vista o volver a la pantalla principal.
        </p>

        <div className="flex flex-col gap-3">
          <Button type="button" onClick={reset} className="w-full">
            Reintentar
          </Button>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-[var(--background)] border-2 border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--card)] hover:border-[var(--secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            Volver al inicio
          </Link>
        </div>

        <p className="mt-4 text-[0.7rem] text-[var(--muted-foreground)]">
          Si el problema persiste, prueba a cerrar sesión y volver a entrar.
        </p>
      </div>
    </div>
  );
}

