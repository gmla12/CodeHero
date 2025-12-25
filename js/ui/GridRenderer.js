CodeHero.UI.GridRenderer = {};
let heroSprite = null;

CodeHero.UI.GridRenderer.initGameMap = function () {
    const eng = document.getElementById('game-engine');
    if (!eng) return;
    eng.innerHTML = '';
    eng.className = 'game-grid';

    const map = CodeHero.State.currentMap;
    const sz = Math.floor(Math.min(300 / map[0].length, 50));
    eng.style.gridTemplateColumns = `repeat(${map[0].length}, ${sz}px)`;

    map.forEach((row, y) => {
        row.forEach((type, x) => {
            const d = document.createElement('div');
            d.className = 'cell';
            d.id = `cell-${x}-${y}`;
            d.style.width = `${sz}px`; d.style.height = `${sz}px`; d.style.fontSize = `${sz * 0.6}px`;

            if (type === 1) d.classList.add('wall');
            else if (type === 2) { d.classList.add('key'); d.innerText = '🔑'; }
            else if (type === 3) { d.classList.add('door'); d.innerText = CodeHero.State.hasKey ? '🔓' : '🔒'; }
            else if (type === 4) { d.classList.add('portal'); d.innerText = '🌀'; }
            else d.classList.add('path');

            if (x === CodeHero.State.currentLevel.end.x && y === CodeHero.State.currentLevel.end.y) {
                d.innerText = '🚩'; d.classList.add('end');
            }
            eng.appendChild(d);
        });
    });

    heroSprite = document.createElement('div');
    heroSprite.className = 'hero-sprite';
    heroSprite.style.width = `${sz}px`; heroSprite.style.height = `${sz}px`; heroSprite.style.fontSize = `${sz * 0.6}px`;
    heroSprite.innerText = ['⬆️', '➡️', '⬇️', '⬅️'][CodeHero.State.heroPos.dir];
    eng.appendChild(heroSprite);

    CodeHero.UI.GridRenderer.updateHeroVisuals();
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.GridRenderer.updateHeroVisuals = function () {
    if (!heroSprite) heroSprite = document.querySelector('.hero-sprite');
    if (!heroSprite) return;

    const cell = document.getElementById(`cell-${CodeHero.State.heroPos.x}-${CodeHero.State.heroPos.y}`);
    if (cell) {
        heroSprite.style.left = cell.offsetLeft + 'px';
        heroSprite.style.top = cell.offsetTop + 'px';
        heroSprite.style.width = cell.offsetWidth + 'px';
        heroSprite.style.height = cell.offsetHeight + 'px';
    }
    heroSprite.innerText = ['⬆️', '➡️', '⬇️', '⬅️'][CodeHero.State.heroPos.dir];
    if (CodeHero.State.hasKey) heroSprite.style.border = "3px solid gold";
    else heroSprite.style.border = "none";
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.GridRenderer.updateCell = function (x, y, type) {
    const d = document.getElementById(`cell-${x}-${y}`);
    if (!d) return;
    d.className = 'cell path'; d.innerText = '';
    if (type === 3) { d.classList.add('door'); d.innerText = CodeHero.State.hasKey ? '🔓' : '🔒'; }
    else if (type === 4) { d.classList.add('portal'); d.innerText = '🌀'; }
};
