
import { createClient } from '@supabase/supabase-js';

// Inicialización Robusta de Supabase
// Usamos try-catch para permitir que Vite realice el reemplazo estático de strings durante el build
// PERO capturamos cualquier error en tiempo de ejecución si import.meta.env no está definido.

let supabaseUrl = 'https://placeholder.supabase.co';
let supabaseKey = 'placeholder';

try {
    // Vite buscará y reemplazará estas cadenas exactas.
    // Si no las reemplaza y env es undefined, saltará al catch sin romper la app.
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env.VITE_SUPABASE_URL && typeof import.meta.env.VITE_SUPABASE_URL === 'string') {
            // @ts-ignore
            supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        }
        // @ts-ignore
        if (import.meta.env.VITE_SUPABASE_ANON_KEY && typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string') {
            // @ts-ignore
            supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        }
    }
} catch (error) {
    console.warn('Supabase env vars not detected, running in placeholder mode.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
