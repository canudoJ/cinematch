import {
    buildPlatformSearchUrl, expandProviderIds, findProvider, googleWatchUrl, normalizeProviderName, providerName,
} from '../providers';

describe('plataformas', () => {
    it('agrupa todos los IDs de HBO Max bajo la misma plataforma', () => {
        for (const id of ['384', '1899', '118', '1825']) {
            expect(findProvider(id)?.name).toBe('HBO Max');
        }
    });

    it('no confunde Netflix con anuncios (1796) con HBO Max', () => {
        expect(providerName('1796')).toBe('Netflix');
    });

    it('expande los IDs principales a todos sus alias sin duplicados', () => {
        const ids = expandProviderIds(['384', '8', '384']);
        expect(ids).toEqual(expect.arrayContaining(['384', '1899', '118', '8', '1796']));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('deja pasar IDs desconocidos tal cual', () => {
        expect(expandProviderIds(['999'])).toEqual(['999']);
    });

    it('usa el nombre de reserva para proveedores desconocidos', () => {
        expect(providerName(63)).toBe('Filmin');
        expect(providerName(424242, 'Otro')).toBe('Otro');
    });

    it('normaliza nombres para compararlos', () => {
        expect(normalizeProviderName('HBO Max')).toBe(normalizeProviderName('hbo-max'));
    });
});

describe('URLs de búsqueda', () => {
    it('construye la búsqueda en la plataforma con el título codificado', () => {
        expect(buildPlatformSearchUrl('Netflix', 'La La Land')).toBe('https://www.netflix.com/search?q=La%20La%20Land');
        expect(buildPlatformSearchUrl('Amazon Prime Video', 'Dune')).toContain('primevideo.com/search?phrase=Dune');
        expect(buildPlatformSearchUrl('HBO Max Amazon Channel', 'Dune')).toContain('hbomax.com');
    });

    it('cae a Google si la plataforma no admite búsqueda por URL', () => {
        const url = buildPlatformSearchUrl('Filmin', 'Amélie');
        expect(url).toBe(googleWatchUrl('Amélie', 'Filmin'));
        expect(url).toContain(encodeURIComponent('ver Amélie en Filmin'));
    });
});
