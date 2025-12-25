CodeHero.Managers.LevelManager = {};

CodeHero.Managers.LevelManager.prepareLevel = function (idx) {
    const level = CodeHero.Data.LEVELS[idx];
    if (!level) return;

    CodeHero.State.resetLevelState(level);

    // UI Updates
    const hudTitle = document.getElementById('hud-level-name');
    if (hudTitle) hudTitle.innerText = level.title;

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.innerText = `Nivel ${level.id}: ${level.title}`;

    let instructionsHtml = '';
    if (level.type === 'Bucles') {
        instructionsHtml = `
            <div style="background:rgba(46, 213, 115, 0.15); border:1px solid #2ed573; padding:10px; border-radius:6px; margin:10px 0; font-size:0.85rem; text-align:left">
                <strong style="color:#2ed573">🎓 TUTORIAL DE BUCLES</strong>
                <ul style="margin:5px 0 0 15px; padding:0; color:#ddd">
                    <li>Pulsa <b style="color:#2ed573">Start 🔄</b> para grabar.</li>
                    <li>Ingresa los pasos del patrón (ej: ⬆, ↺).</li>
                    <li>Pulsa <b style="color:#ff4757">End ⏹</b> y di cuántas veces repetir.</li>
                </ul>
            </div>`;
    }

    const modalDesc = document.getElementById('modal-desc');
    if (modalDesc) {
        modalDesc.innerHTML = `
            <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; margin-bottom:15px; font-style:italic">
                💡 ${level.description || "Lleva al robot a la meta."}
            </div>
            ${instructionsHtml}
            <strong>🎯 Objetivo 3 Estrellas:</strong> ${level.perfect} bloques o menos.<br>
            <span style="font-size:0.9rem; color:#aaa">${level.type === 'Bucles' ? '(¡Usa el botón de Bucle para ahorrar pasos!)' : '(Cuenta bien tus pasos y busca atajos)'}</span>
        `;
    }

    const instrModal = document.getElementById('instruction-modal');
    if (instrModal) instrModal.style.display = 'flex';

    // Resetear botones loop
    const loopContainer = document.querySelector('.loop-controls');
    const btnStart = document.getElementById('btn-loop-start');
    const btnEnd = document.getElementById('btn-loop-end');

    if (loopContainer) {
        // Habilitar bucles para niveles que lo requieran o sean avanzados
        const loopLevels = ['Bucles', 'Patrones', 'Avanzado', 'Boss', 'Debugging', 'Condicionales'];

        if (loopLevels.includes(level.type)) {
            loopContainer.style.display = 'flex';
            if (btnStart) btnStart.style.display = 'block';
            if (btnEnd) btnEnd.style.display = 'none';
        } else {
            loopContainer.style.display = 'none';
        }
    }

    CodeHero.UI.UIRenderer.nav('game');
    CodeHero.UI.GridRenderer.initGameMap();
    CodeHero.UI.Timeline.renderTimeline();
    CodeHero.UI.UIRenderer.updateConsole();
};

CodeHero.Managers.LevelManager.handleVictory = function () {
    let stars = 1;
    if (CodeHero.State.gameCommands.length <= CodeHero.State.currentLevel.perfect) stars = 3;
    else if (CodeHero.State.gameCommands.length <= CodeHero.State.currentLevel.perfect + 2) stars = 2;

    CodeHero.State.currentUser.score += 100 * stars;
    if ((CodeHero.State.currentUser.stars[CodeHero.State.currentLevel.id] || 0) < stars) CodeHero.State.currentUser.stars[CodeHero.State.currentLevel.id] = stars;

    // Fix: maxLevel is Index-based (0 for L1). Check if we just beat the highest unlocked level.
    // Level IDs are 1-based. Level 1 has Index 0.
    const levelIdx = CodeHero.State.currentLevel.id - 1;
    if (CodeHero.State.currentUser.maxLevel === levelIdx) {
        CodeHero.State.currentUser.maxLevel++;
    }

    CodeHero.Managers.BotManager.updateScores();
    CodeHero.Managers.DataManager.saveData();

    CodeHero.Managers.LevelManager.showVictoryModal(stars, CodeHero.State.gameCommands.length, CodeHero.State.currentLevel.perfect);
};

CodeHero.Managers.LevelManager.showVictoryModal = function (stars, steps, goal) {
    const modal = document.getElementById('victory-modal');
    const starsDiv = document.getElementById('victory-stars');
    const detailsDiv = document.getElementById('victory-details');

    if (!modal) return;

    let starHTML = '';
    for (let i = 0; i < 3; i++) {
        if (i < stars) starHTML += `<span class="star-pop" style="animation-delay:${i * 0.2}s; display:inline-block">⭐</span>`;
        else starHTML += `<span style="opacity:0.3">☆</span>`;
    }

    starsDiv.innerHTML = starHTML;
    detailsDiv.innerHTML = `Pasos: <strong>${steps}</strong><br><small style="color:var(--text-muted)">Meta: ${goal}</small>`;
    modal.style.display = 'flex';
};

CodeHero.Managers.LevelManager.nextLevel = function () {
    const modal = document.getElementById('victory-modal');
    if (modal) modal.style.display = 'none';

    const currentIdx = CodeHero.Data.LEVELS.findIndex(l => l.id === CodeHero.State.currentLevel.id);
    if (currentIdx !== -1 && currentIdx < CodeHero.Data.LEVELS.length - 1) {
        CodeHero.Managers.LevelManager.prepareLevel(currentIdx + 1);
    } else {
        CodeHero.Managers.LevelManager.goToDashboard();
    }
};

CodeHero.Managers.LevelManager.goToDashboard = function () {
    CodeHero.UI.DashboardRenderer.updateUserDisplay();
    CodeHero.UI.UIRenderer.nav('dash');
    const modal = document.getElementById('victory-modal');
    if (modal) modal.style.display = 'none';
};

CodeHero.Managers.LevelManager.restartLevel = function () {
    const modal = document.getElementById('victory-modal');
    if (modal) modal.style.display = 'none';
    CodeHero.Managers.LevelManager.prepareLevel(CodeHero.State.currentLevel.id);
};

CodeHero.Managers.LevelManager.showInstructions = function () {
    const modal = document.getElementById('instruction-modal');
    if (modal) modal.style.display = 'flex';
};

// Removed legacy window globals (restartLevel, nextLevel, showInstructions, goToDashboard) as they are now fully managed via CodeHero.Managers.LevelManager

