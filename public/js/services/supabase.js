import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Load from Runtime Config (env.js) or Fallback
// Load from Runtime Config (env.js) or Fallback
const env = window.ENV || {};

// Safe access that allows Vite to replace the string "import.meta.env.VITE_..."
// while preventing crashes in raw environments where import.meta.env is undefined.
const viteEnv = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || viteEnv.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || viteEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    console.error('Supabase Config Missing. Debug Info:', {
        windowEnv: env,
        viteEnvKeys: Object.keys(viteEnv)
    });
    console.warn('Supabase credentials missing! Check .env file or Vercel Settings.');
    alert("⚠️ Error: Configuración de Supabase faltante (Check Console).\n\nRevisa tus variables de entorno en Vercel.");
    throw new Error("Supabase Credentials Missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Expose to global scope for legacy code support
window.CodeHero = window.CodeHero || {};
window.CodeHero.Supabase = supabase;
window.supabase = supabase; // Legacy Fallback
