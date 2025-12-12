import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase robusta
// Usamos un fallback (|| {}) para evitar que la app explote si import.meta.env es undefined

let supabaseUrl = 'https://placeholder.supabase.co';
let supabaseKey = 'placeholder';

// Acceso seguro: Si import.meta.env no existe, usa un objeto vacío para no romper la ejecución
// @ts-ignore
const env = (import.meta.env || {}) as any;

const envUrl = env.VITE_SUPABASE_URL as string | undefined;
const envKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (envUrl && envKey) {
    supabaseUrl = envUrl;
    supabaseKey = envKey;
}

// Inicialización del cliente
export const supabase = createClient(supabaseUrl, supabaseKey);