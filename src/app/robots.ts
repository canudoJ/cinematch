import type { MetadataRoute } from 'next';

/** Demo privada: ningún buscador debe rastrearla */
export default function robots(): MetadataRoute.Robots {
    return { rules: { userAgent: '*', disallow: '/' } };
}
