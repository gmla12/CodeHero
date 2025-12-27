import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Load from Runtime Config (env.js) or Fallback
// Load from Runtime Config (env.js) or Fallback
const env = window.ENV || {};

// Safe access that allows Vite to replace the string "import.meta.env.VITE_..."
// while preventing crashes in raw environments where import.meta.env is undefined.
const supabaseUrl = env.VITE_SUPABASE_URL || (import.meta.env && import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    console.warn('Supabase credentials missing! Check .env file.');
    alert("⚠️ Error: Configuración de Supabase faltante.\n\nPor favor edita el archivo .env y agrega tu URL y Key de Supabase.");
    throw new Error("Supabase Credentials Missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Expose to global scope for legacy code support
window.CodeHero = window.CodeHero || {};
window.CodeHero.Supabase = supabase;
window.supabase = supabase; // Legacy Fallback
