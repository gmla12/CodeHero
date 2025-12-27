// This file is processed by Vite to inject Environment Variables
// It makes them available to legacy scripts in strict static paths.

window.ENV = window.ENV || {};

// Inject specific keys we need
// Note: We must explicitly reference import.meta.env.KEY for Vite to replace it statically.
window.ENV.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
window.ENV.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
window.ENV.NEXT_PUBLIC_SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL; // Fallback
window.ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Fallback

console.log("Environment Variables Loaded via Vite Module");
