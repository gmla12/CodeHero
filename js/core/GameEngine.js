CodeHero.Core.GameEngine = {};

CodeHero.Core.GameEngine.runGame = async function () {
    if (CodeHero.State.gameCommands.length === 0) return CodeHero.UI.UIRenderer.showModal("⚠️ ATENCIÓN", "¡Debes programar al menos un comando antes de ejecutar!");

    // Reset para inicio visual
    CodeHero.State.heroPos = { ...CodeHero.State.currentLevel.start, dir: 1 };
    CodeHero.State.hasKey = false;
    CodeHero.State.currentMap = JSON.parse(JSON.stringify(CodeHero.State.currentLevel.map));

    // Clear any previous highlights
    if (CodeHero.UI.Timeline.clearHighlights) CodeHero.UI.Timeline.clearHighlights();

    CodeHero.UI.GridRenderer.initGameMap();

    await CodeHero.Utils.sleep(500);

    const executionQueue = CodeHero.Utils.flattenCommands(CodeHero.State.gameCommands);

    for (let cmdObj of executionQueue) {
        // cmdObj is now { action: 'moveForward', uiIndex: 0, consoleId: "0" }
        const cmd = cmdObj.action;
        const uiIndex = cmdObj.uiIndex;
        const consoleId = cmdObj.consoleId;

        // Highlight the block in UI & Console
        if (CodeHero.UI.Timeline.highlightBlock) CodeHero.UI.Timeline.highlightBlock(uiIndex, consoleId);

        await CodeHero.Utils.sleep(600);

        if (cmd === 'turnLeft') CodeHero.State.heroPos.dir = (CodeHero.State.heroPos.dir + 3) % 4;
        if (cmd === 'turnRight') CodeHero.State.heroPos.dir = (CodeHero.State.heroPos.dir + 1) % 4;
        if (cmd === 'moveForward') {
            let nx = CodeHero.State.heroPos.x, ny = CodeHero.State.heroPos.y;
            if (CodeHero.State.heroPos.dir === 0) ny--;
            if (CodeHero.State.heroPos.dir === 1) nx++;
            if (CodeHero.State.heroPos.dir === 2) ny++;
            if (CodeHero.State.heroPos.dir === 3) nx--;

            if (CodeHero.State.currentMap[ny] && CodeHero.State.currentMap[ny][nx] !== undefined) {
                const cell = CodeHero.State.currentMap[ny][nx];
                const heroSprite = document.querySelector('.hero-sprite');

                // Case 1: Wall (1)
                if (cell === 1) {
                    if (heroSprite) {
                        heroSprite.style.transform = "scale(0.8)";
                        setTimeout(() => heroSprite.style.transform = "scale(1)", 200);
                    }
                    return; // Stop movement
                }

                // Case 2: Locked Door (3)
                if (cell === 3) {
                    if (CodeHero.State.hasKey) {
                        // Unlocked! Move and clear door
                        CodeHero.State.heroPos.x = nx; CodeHero.State.heroPos.y = ny;
                        CodeHero.State.currentMap[ny][nx] = 0;
                        CodeHero.UI.GridRenderer.updateCell(nx, ny, 0);
                    } else {
                        // Blocked
                        if (heroSprite) {
                            heroSprite.style.background = "#ff4757";
                            setTimeout(() => heroSprite.style.background = "#444", 300);
                        }
                        return; // Stop movement
                    }
                }
                // Case 3: Empty (0), Key (2), Portal (4)
                else {
                    // Move first
                    CodeHero.State.heroPos.x = nx; CodeHero.State.heroPos.y = ny;

                    // Interact with content
                    if (cell === 2) { // Key
                        CodeHero.State.hasKey = true;
                        CodeHero.State.currentMap[ny][nx] = 0;
                        CodeHero.UI.GridRenderer.updateCell(nx, ny, 0);
                        CodeHero.UI.UIRenderer.updateHUD(); // Ensure UI reflects key immediately
                    }

                    if (cell === 4) { // Portal
                        for (let y = 0; y < CodeHero.State.currentMap.length; y++) {
                            for (let x = 0; x < CodeHero.State.currentMap[0].length; x++) {
                                if (CodeHero.State.currentMap[y][x] === 4 && (x !== nx || y !== ny)) {
                                    CodeHero.State.heroPos.x = x; CodeHero.State.heroPos.y = y;
                                    y = 100; x = 100; // Break loops
                                }
                            }
                        }
                    }
                }
            }
        }
        CodeHero.UI.GridRenderer.updateHeroVisuals();
    }

    // Clear highlights after execution finishes
    if (CodeHero.UI.Timeline.clearHighlights) CodeHero.UI.Timeline.clearHighlights();

    setTimeout(() => {
        if (CodeHero.State.heroPos.x === CodeHero.State.currentLevel.end.x && CodeHero.State.heroPos.y === CodeHero.State.currentLevel.end.y) {
            CodeHero.Managers.LevelManager.handleVictory();
        } else {
            // MOSTRAR MODAL DERROTA
            const defeatModal = document.getElementById('defeat-modal');
            const btnRetry = document.getElementById('btn-retry-defeat');

            if (defeatModal) {
                defeatModal.style.display = 'flex';
                // Bind one-time click or ensure it doesn't stack listeners
                btnRetry.onclick = () => {
                    defeatModal.style.display = 'none';
                    CodeHero.Managers.LevelManager.prepareLevel(CodeHero.State.currentLevel.id);
                };
            }
        }
    }, 500);
};
