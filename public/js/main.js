// Main Entry Point & Event Binding
CodeHero.Main = {};

CodeHero.Main.init = async function () {
    document.body.classList.add('loading'); // Security: Hide everything

    // Init Managers
    CodeHero.Managers.DataManager.initData();

    // Init User Logic (Will trigger data load if Session exists)
    CodeHero.Managers.UserManager.initUserUI();

    // Init Utilities
    CodeHero.Utils.Draggable.initAll();

    // Bind Events
    CodeHero.Main.bindEvents();

    document.body.classList.remove('loading'); // Show UI
};

CodeHero.Main.bindEvents = function () {
    const bind = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
        else console.warn(`Element #${id} not found for binding`);
    };

    // --- Login & User ---
    // bind('btn-new-hero', ...); // Legacy removed
    bind('btn-save-user', () => CodeHero.Managers.UserManager.saveUser());
    bind('btn-edit-avatar', () => CodeHero.Managers.UserManager.startCreator(true));
    bind('btn-leaderboard', () => CodeHero.Managers.UserManager.showLeaderboard());
    bind('btn-logout', () => CodeHero.Managers.UserManager.logout());

    // Global Back Buttons (Class based)
    document.querySelectorAll('.fab-back').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Determine logic based on context or just history? 
            // Currently logic is simple: if in creator -> login, if in leaderboard -> dash
            // But checking the screen is better.
            const screen = document.querySelector('.screen.active').id;
            if (screen === 'screen-creator') {
                // Smart Back: Go to Dash if user is logged in (Edit Mode), else Login
                if (CodeHero.State.currentUser && CodeHero.State.currentUser.id) CodeHero.UI.UIRenderer.nav('dash');
                else CodeHero.UI.UIRenderer.nav('login');
            }
            else if (screen === 'screen-leaderboard') CodeHero.UI.UIRenderer.nav('dash');
        });
    });

    // --- Dashboard ---
    bind('btn-leaderboard', () => CodeHero.Managers.UserManager.showLeaderboard());

    // --- Game Controls ---
    bind('btn-close-game', () => CodeHero.Managers.LevelManager.goToDashboard());
    bind('btn-help', () => CodeHero.Managers.LevelManager.showInstructions());

    bind('btn-undo', () => CodeHero.UI.Timeline.removeLastCmd());
    bind('btn-clear', () => CodeHero.UI.Timeline.clearCmds());

    bind('btn-move-forward', () => CodeHero.UI.Timeline.addCmd('moveForward'));
    bind('btn-turn-left', () => CodeHero.UI.Timeline.addCmd('turnLeft'));
    bind('btn-turn-right', () => CodeHero.UI.Timeline.addCmd('turnRight'));

    bind('btn-loop-start', () => CodeHero.UI.Timeline.startLoop());
    bind('btn-loop-end', () => CodeHero.UI.Timeline.closeLoop());
    bind('btn-run', () => CodeHero.Core.GameEngine.runGame());

    // --- Modals ---
    bind('instruction-modal', function (e) { this.style.display = 'none'; }); // Close on click
    bind('btn-restart', () => CodeHero.Managers.LevelManager.restartLevel());
    bind('btn-next-level', () => CodeHero.Managers.LevelManager.nextLevel());

    // --- Dev Tools ---
    bind('btn-dev-unlock', () => CodeHero.Managers.UserManager.unlockAllLevels());
    bind('btn-dev-reset', () => CodeHero.Managers.UserManager.resetAllLevels());
    bind('btn-dev-update', () => CodeHero.Managers.UserManager.forceAppUpdate());
};

window.onload = CodeHero.Main.init;

