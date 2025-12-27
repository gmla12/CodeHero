CodeHero.UI.DashboardRenderer = {};

CodeHero.UI.DashboardRenderer.renderMap = function () {
    const area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = '';

    // Check Data Availability
    if (!CodeHero.Data.WORLDS || !CodeHero.Data.LEVELS) {
        area.innerHTML = '<div class="loading-spinner">Cargando Misiones...</div>';
        return;
    }

    const completedCount = CodeHero.State.currentUser.maxLevel || 0; // Assuming maxLevel is count of completed
    // Or if maxLevel is the ID of the max level... Let's assume progress is sequential for the path.

    // --- DYNAMIC STYLES INJECTION ---
    let styleBlock = document.getElementById('dynamic-types-style');
    if (!styleBlock) {
        styleBlock = document.createElement('style');
        styleBlock.id = 'dynamic-types-style';
        document.head.appendChild(styleBlock);
    }

    let cssRules = '';
    console.log("🎨 Generating Dynamic Colors using:", CodeHero.Data.LEVEL_TYPES);

    if (CodeHero.Data.LEVEL_TYPES && CodeHero.Data.LEVEL_TYPES.length > 0) {
        CodeHero.Data.LEVEL_TYPES.forEach(type => {
            // Safe Slug
            const slug = (type.slug || type.name).toLowerCase().replace(/\s+/g, '-');
            const color = type.color || '#fff';

            // Generate CSS Class override
            // We target specific elements to ensure it overrides defaults
            cssRules += `
                .level-node.type-${slug} {
                    background-color: ${color} !important;
                    box-shadow: 0 0 15px ${color}66 !important;
                    border-color: ${color} !important;
                }
                .level-node.type-${slug} .node-icon {
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
            `;
        });
        console.log("🎨 Rules Injected:", cssRules);
    }
    styleBlock.innerHTML = cssRules;
    // --------------------------------



    // CREATE PATH CONTAINER
    const pathContainer = document.createElement('div');
    pathContainer.className = 'game-path-container';

    // Group Levels by World -> Phase
    // Iterate Worlds
    CodeHero.Data.WORLDS.forEach(world => {
        // WORLD HEADER
        const worldHeader = document.createElement('div');
        worldHeader.className = `world-header world-style-${world.style || 'default'}`;
        worldHeader.innerHTML = `
            <div class="world-bg-icon">🌍</div>
            <h2>${world.title}</h2>
            <p>${world.description || 'Explora este mundo'}</p>
        `;
        pathContainer.appendChild(worldHeader);

        // Filter Phases
        const phases = CodeHero.Data.PHASES.filter(p => p.world_id === world.id).sort((a, b) => a.order_index - b.order_index);

        phases.forEach(phase => {
            // PHASE MARKER (Optional, maybe just a divider)
            const phaseLabel = document.createElement('div');
            phaseLabel.className = 'phase-label';
            phaseLabel.innerText = phase.title.toUpperCase();
            pathContainer.appendChild(phaseLabel);

            // LEVELS IN PHASE
            const levels = CodeHero.Data.LEVELS.filter(l => l.phase_id === phase.id).sort((a, b) => a.id - b.id);

            levels.forEach((lvl, idx) => {
                // Determine Status
                const globalIdx = CodeHero.Data.LEVELS.findIndex(l => l.id === lvl.id);
                // Unlocked if previous global index < completedCount?
                // Let's assume completedCount is the number of levels finished.
                // So if I finished 0, globalIdx 0 is open.
                // If I finished 1, globalIdx 0 (done) and 1 (open) are visible.

                const isCompleted = globalIdx < completedCount;
                const isUnlocked = globalIdx <= completedCount;
                const isLocked = !isUnlocked;

                const stars = CodeHero.State.currentUser.stars[lvl.id] || 0;

                // Path Position Logic (ZigZag)
                // 0: Center, 1: Left, 2: Center, 3: Right, 4: Center ...
                // Cycle: Center -> Left -> Center -> Right ... pattern of 4
                // idx % 4: 0(C), 1(L), 2(C), 3(R)
                let posClass = 'path-center';
                const pattern = globalIdx % 4;
                if (pattern === 1) posClass = 'path-left';
                if (pattern === 3) posClass = 'path-right';

                const node = document.createElement('div');
                node.className = `level-node-wrapper ${posClass}`;

                // SVG / Icon for Level
                let iconChar = '★'; // Default
                if (lvl.type === 'Tutorial') iconChar = '🎓';
                if (lvl.type === 'Boss') iconChar = '💀';
                if (lvl.type === 'Debugging') iconChar = '🐞';
                if (lvl.type === 'Refactor') iconChar = '🛠️';
                if (isLocked) iconChar = '🔒';
                else if (isCompleted) iconChar = '✅';

                // Star Rating Display
                let starsHTML = '';
                if (isCompleted || stars > 0) {
                    starsHTML = '<div class="node-stars">';
                    for (let i = 0; i < 3; i++) {
                        starsHTML += `<span class="${i < stars ? 'on' : 'off'}">★</span>`;
                    }
                    starsHTML += '</div>';
                }

                // Resolve Type Slug to match Dynamic CSS
                let typeSlug = 'basic';
                if (CodeHero.Data.LEVEL_TYPES) {
                    const typeObj = CodeHero.Data.LEVEL_TYPES.find(t => t.name === lvl.type || t.slug === lvl.type);
                    if (typeObj) {
                        typeSlug = (typeObj.slug || typeObj.name).toLowerCase().replace(/\s+/g, '-');
                    } else if (lvl.type) {
                        typeSlug = lvl.type.toLowerCase().replace(/\s+/g, '-');
                    }
                }

                node.innerHTML = `
                    <div class="level-node ${isLocked ? 'locked' : (isCompleted ? 'completed' : 'current')} type-${typeSlug}" onclick="CodeHero.Managers.LevelManager.prepareLevel(${globalIdx})">
                        <div class="node-icon">${iconChar}</div>
                        ${starsHTML}
                        <div class="node-popover">
                            <strong>${lvl.title}</strong>
                            <p>${lvl.description || 'Completar para avanzar'}</p>
                            <div class="btn-play">JUGAR ▶</div>
                        </div>
                    </div>
                `;

                pathContainer.appendChild(node);

                // Path Connector (Line)
                // Not the last one?
                // Actually CSS borders or pseudoelements are better for lines.
            });
        });
    });

    // Spacer at bottom
    pathContainer.appendChild(document.createElement('div')).style.height = '100px';

    area.appendChild(pathContainer);

    // Scroll to current level
    setTimeout(() => {
        const current = document.querySelector('.level-node.current');
        if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
};

// Actualiza toda la info del usuario en el Dashboard
CodeHero.UI.DashboardRenderer.updateUserDisplay = function () {
    const user = CodeHero.State.currentUser;
    if (!user) return;

    const elName = document.getElementById('dash-name');
    const elScore = document.getElementById('dash-score');
    const elAvatar = document.getElementById('dash-avatar');

    if (elName) elName.innerText = user.name;
    if (elScore) elScore.innerText = (user.score || 0) + ' XP';
    if (elAvatar) elAvatar.innerHTML = CodeHero.UI.drawAvatar(user.avatar, user.name);

    CodeHero.UI.DashboardRenderer.renderMap();
};
