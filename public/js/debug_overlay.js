(function () {
    const d = document.createElement('div');
    d.style.position = 'fixed';
    d.style.top = '0';
    d.style.left = '0';
    d.style.width = '100%';
    d.style.height = 'auto';
    d.style.background = 'rgba(255, 0, 0, 0.9)';
    d.style.color = 'white';
    d.style.zIndex = '100000';
    d.style.padding = '10px';
    d.style.fontFamily = 'monospace';
    d.style.fontSize = '12px';
    d.style.pointerEvents = 'none';
    d.id = 'debug-overlay';
    document.body.appendChild(d);

    function updateDebug() {
        const levels = (window.CodeHero && CodeHero.Data && CodeHero.Data.LEVELS) ? CodeHero.Data.LEVELS.length : 0;
        const worlds = (window.CodeHero && CodeHero.Data && CodeHero.Data.WORLDS) ? CodeHero.Data.WORLDS.length : 0;
        const mapContent = document.getElementById('content-area') ? document.getElementById('content-area').innerHTML.length : 0;
        const swState = navigator.serviceWorker.controller ? 'Active' : ' None';

        d.innerHTML = `
            <strong>DEBUG MODE ACTIVE</strong><br>
            Levels Loaded: ${levels}<br>
            Worlds Loaded: ${worlds}<br>
            Map Content Size: ${mapContent} chars<br>
            Service Worker: ${swState}<br>
            User: ${CodeHero.State && CodeHero.State.currentUser ? CodeHero.State.currentUser.name : 'None'}
        `;
    }

    setInterval(updateDebug, 1000);
})();
