import { defineConfig } from 'vite';

export default defineConfig({
    // Root is current dir
    root: './',
    // Public dir for static assets (img, etc) if not in root, but here they are mixed.
    // Vite serves root by default.
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: 'index.html',
                admin: 'admin.html'
            }
        }
    }
});
