import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 
   * Optimización de imágenes remotas (TMDB + Supabase)
   * Esto permite usar `next/image` con las carátulas y avatares.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org", // Posters de TMDB
      },
      {
        protocol: "https",
        hostname: "dhrkwrxplccmenochytg.supabase.co", // Avatares/medios almacenados en Supabase
      },
    ],
  },
};

export default nextConfig;
