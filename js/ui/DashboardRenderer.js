CodeHero.UI.DashboardRenderer = {};

CodeHero.UI.DashboardRenderer.renderMap = function () {
    const area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = '';

    // Check Data Availability
    if (!CodeHero.Data.WORLDS || !CodeHero.Data.PHASES) {
        // Fallback or Loading
        area.innerHTML = '<p style="text-align:center; color:#666">Cargando Mapa del Mundo...</p>';
        return;
    }

    // Iterate Worlds
    CodeHero.Data.WORLDS.forEach(world => {
        const worldSection = document.createElement('div');
        worldSection.className = 'world-section';

        worldSection.innerHTML = `
            <div style="margin-bottom:15px">
                <h3 class="world-title" style="margin-bottom:5px">${world.title}</h3>
                <p style="color:var(--text-muted); font-size:0.9rem; margin:0; line-height:1.4">${world.description || ''}</p>
            </div>
        `;

        const path = document.createElement('div');
        path.className = 'phase-path';

        // Filter Phases for this World
        const worldPhases = CodeHero.Data.PHASES.filter(p => p.world_id === world.id);

        worldPhases.forEach((phase, pIdx) => {
            // Unlocking Logic (Mock: Unlock if previous phase levels done? Or just sequential?)
            // For now: Unlock ALL for demo, or check maxLevel vs phase levels.
            // Let's use simple logic: If User Max Level >= ANY level in this phase, it's active.
            // Actually, simplified: Unlocked if previous phase completed.
            // Let's default to OPEN for now to verify UI.
            const locked = false; // Implement logic later

            const node = document.createElement('div');
            node.className = `phase-node ${locked ? 'locked' : 'active'}`; // Add 'completed' logic

            node.innerHTML = `
                <div class="phase-icon">${locked ? '🔒' : (pIdx + 1)}</div>
                <div class="phase-content" style="flex:1">
                    <h4>${phase.title}</h4>
                    <p>${phase.description || 'Misión Principal'}</p>
                    <div class="level-list-dropdown" id="phase-levels-${phase.id}"></div>
                </div>
                <div style="color:var(--text-muted)">▼</div>
            `;

            // Auto-Expand Logic
            // Find the level corresponding to maxLevel (current cursor)
            // maxLevel is the count of completed, so index of next level is maxLevel.
            const nextLevelIdx = Math.min(CodeHero.State.currentUser.maxLevel, CodeHero.Data.LEVELS.length - 1);
            const nextLevel = CodeHero.Data.LEVELS[nextLevelIdx];
            const isActivePhase = (nextLevel && nextLevel.phase_id === phase.id);

            // Click Handler for Accordion
            node.onclick = (e) => {
                if (locked) return;
                // Avoid toggling if clicking a level chip
                if (e.target.classList.contains('level-chip')) return;

                const drop = document.getElementById(`phase-levels-${phase.id}`);
                const isOpen = drop.style.display === 'grid';

                // Close others? Optional.
                document.querySelectorAll('.level-list-dropdown').forEach(d => {
                    if (d.id !== `phase-levels-${phase.id}`) d.style.display = 'none';
                });
                document.querySelectorAll('.phase-node').forEach(n => {
                    if (n !== node) n.classList.remove('expanded');
                });

                if (!isOpen) {
                    drop.style.display = 'grid';
                    CodeHero.UI.DashboardRenderer.renderLevelsInPhase(phase.id, drop);
                    node.classList.add('expanded');
                } else {
                    drop.style.display = 'none';
                    node.classList.remove('expanded');
                }
            };

            path.appendChild(node);

            // Trigger Auto-Expand if active
            if (isActivePhase) {
                setTimeout(() => node.click(), 100); // Small delay to ensure DOM insertion
            }
        });

        worldSection.appendChild(path);
        area.appendChild(worldSection);
    });
};

CodeHero.UI.DashboardRenderer.renderLevelsInPhase = function (phaseId, container) {
    container.innerHTML = '';
    const levels = CodeHero.Data.LEVELS.filter(l => l.phase_id === phaseId);

    if (levels.length === 0) {
        container.innerHTML = '<small style="color:#666; grid-column:span 3">No hay niveles aún.</small>';
        return;
    }

    levels.forEach((lvl, idx) => {
        // Find Global Index for User Progress Check (since levels are 1-based IDs usually?)
        // We compare lvl.id or global index against CodeHero.State.currentUser.maxLevel
        // Assuming user.maxLevel represents the highest LEVEL ID completed? Or index?
        // Let's assume maxLevel is an Index 0-based relative to ALL levels array? No, that's risky.
        // Let's assume maxLevel is count of completed levels.

        // Simple Logic:
        const globalIdx = CodeHero.Data.LEVELS.findIndex(l => l.id === lvl.id);
        const isUnlocked = globalIdx <= CodeHero.State.currentUser.maxLevel;
        const stars = CodeHero.State.currentUser.stars[lvl.id] || 0;

        let starHTML = '';
        if (stars === 0) starHTML = '<span style="color:#555; filter:grayscale(1)">⭐</span>';
        else {
            for (let i = 0; i < stars; i++) starHTML += '⭐';
        }

        const chip = document.createElement('div');
        chip.className = `level-chip ${isUnlocked ? (stars > 0 ? 'completed' : '') : 'locked'}`;
        chip.style.opacity = isUnlocked ? '1' : '0.5';
        chip.innerHTML = `<span style="font-weight:bold">${lvl.id}</span> <div style="font-size:0.8rem">${starHTML}</div>`;

        if (isUnlocked) {
            chip.onclick = (e) => {
                e.stopPropagation(); // Prevent toggling phase
                CodeHero.Managers.LevelManager.prepareLevel(globalIdx);
            };
        }

        container.appendChild(chip);
    });
};

// Actualiza toda la info del usuario en el Dashboard
CodeHero.UI.DashboardRenderer.updateUserDisplay = function () {
    const user = CodeHero.State.currentUser;
    if (!user) return;

    const elName = document.getElementById('dash-name');
    const elScore = document.getElementById('dash-score');
    const elAvatar = document.getElementById('dash-avatar');

    if (elName) elName.innerText = user.name;
    if (elScore) elScore.innerText = (user.score || 0) + ' Pts';
    if (elAvatar) elAvatar.innerHTML = CodeHero.UI.drawAvatar(user.avatar, user.name);

    CodeHero.UI.DashboardRenderer.renderMap();
};
