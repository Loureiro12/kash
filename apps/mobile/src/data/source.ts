/** Fonte de dados: `remote` (Supabase, padrão) ou `seed` (demonstração em memória, sem rede). */
export const DATA_SOURCE: 'remote' | 'seed' = process.env.EXPO_PUBLIC_DATA_SOURCE === 'seed' ? 'seed' : 'remote';
