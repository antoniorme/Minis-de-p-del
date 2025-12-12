
import { createClient } from '@supabase/supabase-js';

// Función auxiliar segura para leer env vars
const getEnv = (key: string): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
            // @ts-ignore
            const val = import.meta.env[key];
            return typeof val === 'string' ? val : "";
        }
    } catch (e) {
        return "";
    }
    return "";
};

let supabaseUrl = 'https://placeholder.supabase.co';
let supabaseKey = 'placeholder';

const envUrl = getEnv("VITE_SUPABASE_URL");
const envKey = getEnv("VITE_SUPABASE_ANON_KEY");

if (envUrl && envKey) {
    supabaseUrl = envUrl;
    supabaseKey = envKey;
}

// Inicialización segura del cliente
export const supabase = createClient(supabaseUrl, supabaseKey);
