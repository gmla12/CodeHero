// Load from Global ENV (injected by env.js)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

window.initSupabase = function () {
    if (window.supabase) return; // Already initialized

    const env = window.ENV || {};
    const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
        // Config missing, waiting for injection...
        return;
    }

    try {
        window.supabase = createClient(supabaseUrl, supabaseKey);
        // Expose to CodeHero namespace
        window.CodeHero = window.CodeHero || {};
        window.CodeHero.Supabase = window.supabase;
    } catch (e) {
        console.error("Supabase Init Error:", e);
    }
};

// Auto-try on load
window.initSupabase();
