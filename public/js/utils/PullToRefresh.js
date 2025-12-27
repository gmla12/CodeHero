/**
 * PullToRefresh.js
 * A reusable class to implement Mobile Pull-to-Refresh logic.
 * Forces a hard reload + cache clear.
 */
class PullToRefresh {
    constructor(options = {}) {
        this.threshold = options.threshold || 150;
        this.callback = options.callback || (() => this.defaultReload());

        this.startY = 0;
        this.currentY = 0;
        this.isPulling = false;

        this.container = document.createElement('div');
        this.container.id = 'ptr-indicator';
        this.container.style.cssText = `
            position: fixed;
            top: -60px;
            left: 0;
            width: 100%;
            height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0,0,0,0.8);
            color: white;
            z-index: 10000;
            transition: transform 0.2s ease-out;
            font-weight: bold;
            font-family: sans-serif;
            border-bottom: 2px solid #00d2ff;
        `;
        this.container.innerHTML = '⬇️ Desliza para actualizar';
        document.body.appendChild(this.container);

        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                this.startY = e.touches[0].clientY;
                this.isPulling = true;
            } else {
                this.isPulling = false;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.isPulling) return;

            const y = e.touches[0].clientY;
            const diff = y - this.startY;

            // Only allow pulling down
            if (diff > 0) {
                // Resistance logic
                this.currentY = Math.min(diff * 0.5, this.threshold + 50);

                // Visual Update
                this.container.style.transform = `translateY(${this.currentY}px)`;

                if (this.currentY > this.threshold) {
                    this.container.innerHTML = '⚡ Suelta para recargar';
                    this.container.style.borderColor = '#2ed573'; // Success Green
                } else {
                    this.container.innerHTML = '⬇️ Desliza para actualizar';
                    this.container.style.borderColor = '#00d2ff';
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.isPulling) return;
            this.isPulling = false;

            if (this.currentY > this.threshold) {
                this.container.innerHTML = '🔄 Actualizando...';
                this.callback();
            } else {
                // Reset
                this.container.style.transform = `translateY(0px)`;
                this.currentY = 0;
            }
        });
    }

    async defaultReload() {
        // Force Reload Logic
        console.log("♻️ PullToRefresh Triggered");

        // 1. Clear Service Workers if present
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Clear Caches
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        // 3. Force Reload
        window.location.reload(true);
    }
}

// Auto-Init if requested via attribute script? No, let's export it globally.
window.PullToRefresh = PullToRefresh;
