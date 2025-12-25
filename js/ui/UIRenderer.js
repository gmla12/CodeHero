CodeHero.UI.UIRenderer = {};

CodeHero.UI.UIRenderer.nav = function (screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const scr = document.getElementById('screen-' + screenId);
    if (scr) scr.classList.add('active');
};

CodeHero.UI.UIRenderer.updateHUD = function () {
    if (!CodeHero.State.currentLevel) return;
    const title = document.getElementById('hud-level-name');
    if (title) title.innerText = CodeHero.State.currentLevel.title;

    const stepsEl = document.getElementById('hud-steps');
    if (stepsEl) {
        stepsEl.innerText = `${CodeHero.State.gameCommands.length} / ${CodeHero.State.currentLevel.perfect}`;
        stepsEl.style.color = CodeHero.State.gameCommands.length > CodeHero.State.currentLevel.perfect ? '#ff4757' : 'white';
    }

    const keyEl = document.getElementById('hud-key');
    if (keyEl) {
        if (CodeHero.State.hasKey) keyEl.classList.add('active');
        else keyEl.classList.remove('active');
    }
};

CodeHero.UI.UIRenderer.updateConsole = function () {
    const c = document.getElementById('code-console');
    if (!c) return;

    if (CodeHero.State.gameCommands.length === 0) { c.innerText = "// Consola JS..."; return; }
    let h = "<span style='color:#666'>// Programa:</span><br>";
    CodeHero.State.gameCommands.forEach(cmd => {
        if (typeof cmd === 'object' && cmd.type === 'loop') {
            h += `> for (let i=0; i<${cmd.count}; i++) { ... }<br>`;
        } else {
            const icon = CodeHero.Config.COMMAND_ICONS[cmd];
            if (icon) h += `> ${icon.code}<br>`;
        }
    });
    c.innerHTML = h; c.scrollTop = c.scrollHeight;
};

CodeHero.UI.UIRenderer.showModal = function (title, msg, onConfirm = null, showCancel = false) {
    const modal = document.getElementById('generic-modal');
    if (!modal) return;

    const titleEl = document.getElementById('generic-modal-title');
    if (titleEl) titleEl.innerText = title;

    const msgEl = document.getElementById('generic-modal-msg');
    if (msgEl) msgEl.innerHTML = msg;

    const actions = document.getElementById('generic-modal-actions');
    if (actions) {
        actions.innerHTML = ''; // Reset buttons

        const btnOk = document.createElement('button');
        btnOk.className = 'btn-game';
        btnOk.style.background = 'var(--primary)';
        btnOk.style.color = 'black';
        btnOk.innerText = 'ACEPTAR';
        btnOk.onclick = () => {
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        };
        actions.appendChild(btnOk);

        if (showCancel) {
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-game btn-delete';
            btnCancel.innerText = 'CANCELAR';
            btnCancel.onclick = () => {
                modal.style.display = 'none';
            };
            actions.appendChild(btnCancel);
        }
    }

    modal.style.display = 'flex';
};
