import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "ui-sans-serif", "sans-serif"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        destructive: "var(--destructive)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: "var(--accent)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "var(--radius-sm)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        // Pequeño salto al recibir algo (contador de la selección)
        bump: {
          "0%, 100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
        },
        // Brillo que respira (llamadas a la acción destacadas)
        glow: {
          "0%, 100%": { boxShadow: "0 0 16px var(--primary-glow)" },
          "50%": { boxShadow: "0 0 34px var(--primary-glow), 0 0 8px var(--primary-glow)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "pop-in": "pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        "slide-up": "slide-up 0.35s ease-out both",
        "spin-slow": "spin 3s linear infinite",
        bump: "bump 0.35s ease-out",
        glow: "glow 2.4s ease-in-out infinite",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        modal: "var(--z-modal)",
        "modal-nested": "var(--z-modal-nested)",
        overlay: "var(--z-overlay)",
        dialog: "var(--z-dialog)",
        toast: "var(--z-toast)",
      },
    },
  },
  plugins: [],
};

export default config;
