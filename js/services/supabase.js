import { createClient } from '@supabase/supabase-js';

// Load from Vite env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    console.warn('Supabase credentials missing! Check .env file.');
    alert("⚠️ Error: Configuración de Supabase faltante.\n\nPor favor edita el archivo .env y agrega tu URL y Key de Supabase.");
    throw new Error("Supabase Credentials Missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Expose to global scope for legacy code support if needed, 
// though we aim to import it.
window.CodeHero = window.CodeHero || {};
window.CodeHero.Supabase = supabase;
