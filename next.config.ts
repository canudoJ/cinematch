import type { NextConfig } from 'next';

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : undefined;

const nextConfig: NextConfig = {
    images: {
        // Pósters de TMDB y avatares de Supabase Storage, optimizados por next/image
        remotePatterns: [
            { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
            ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/**' }] : []),
        ],
    },
    // La configuración del feed ahora es un panel de la home
    async redirects() {
        return [{ source: '/setup', destination: '/?open=filters', permanent: true }];
    },
};

export default nextConfig;
