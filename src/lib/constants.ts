export const PROVIDERS = [
    { id: '8', name: 'Netflix', color: '#E50914', textColor: 'white' },
    { id: '119', name: 'Prime Video', color: '#00A8E1', textColor: 'white' },
    { id: '337', name: 'Disney+', color: '#113CCF', textColor: 'white' },
    { id: '384', name: 'HBO Max', color: '#9900FF', textColor: 'white' },
    { id: '283', name: 'Crunchyroll', color: '#F47521', textColor: 'black' }
];

export const HBO_PROVIDER_IDS = ['384', '1899']; // IDs para Max y canales legacy

// Helper map for fallback names (ID -> Name)
export const PROVIDER_NAMES: Record<string, string> = PROVIDERS.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
}, {} as Record<string, string>);

// Manual additions for complex mappings (like HBO legacy)
PROVIDER_NAMES['118'] = 'HBO Max';
PROVIDER_NAMES['1796'] = 'Max Amazon Channel';

export const PROVIDER_MAPPING = {
    'HBO Max': [384, 1899, 118], // Max, Max Amazon, HBO Max Legacy
    'Netflix': [8],
    'Amazon Prime Video': [119],
    'Disney+': [337]
};
