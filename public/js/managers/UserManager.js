CodeHero.Managers.UserManager = {};

CodeHero.Managers.UserManager.initUserUI = async function () {
    CodeHero.Managers.UserManager.bindDelegates(); // Always bind events first

    const supabase = CodeHero.Supabase;
    if (supabase) {
        // 1. Check Config to Update UI
        const { data: config } = await supabase.from('app_settings').select('allow_signup').eq('id', 'config').single();

        // Default to TRUE to be safe, or logic based on requirements
        const allow = config ? config.allow_signup : true;

        if (allow) {
            const btnSignup = document.getElementById('btn-cloud-signup');
            // REVEAL because it is hidden by default in HTML
            if (btnSignup) btnSignup.style.setProperty('display', 'flex', 'important');
        }

        // 2. Check Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            CodeHero.Managers.UserManager.loadUserProfile(session.user);
        }
    }
};

CodeHero.Managers.UserManager.bindDelegates = function () {
    // Auth Buttons
    const btnLogin = document.getElementById('btn-cloud-login');
    const btnSignup = document.getElementById('btn-cloud-signup');
    if (btnLogin) btnLogin.addEventListener('click', CodeHero.Managers.UserManager.handleCloudLogin);
    if (btnSignup) btnSignup.addEventListener('click', CodeHero.Managers.UserManager.handleCloudSignup);

    // Delegate for Creator Controls
    const controls = document.getElementById('controls-list');
    if (controls) {
        controls.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const ds = target.dataset;

            if (action === 'changeType') {
                CodeHero.Managers.UserManager.changeType(ds.value);
            } else if (action === 'changeTab') {
                CodeHero.Managers.UserManager.switchTab(ds.tabId);
            } else if (action === 'changeVal') {
                CodeHero.Managers.UserManager.changeVal(ds.key, parseInt(ds.dir), parseInt(ds.max));
            } else if (action === 'setVal') {
                CodeHero.Managers.UserManager.setVal(ds.key, parseInt(ds.val));
            } else if (action === 'inputName') {
                // Handled via separate 'input' listener usually, but for delegation let's be safe
            }
        });

        controls.addEventListener('input', (e) => {
            if (e.target.id === 'input-name') {
                CodeHero.State.tempAvatar.tempName = e.target.value; // Save on input
                CodeHero.Managers.UserManager.updateCreatorPreview();
            }
        });
    }
};

CodeHero.Managers.UserManager.handleCloudLogin = async function () {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('login-msg');

    msg.innerText = "Conectando...";
    const { data, error } = await CodeHero.Supabase.auth.signInWithPassword({ email, password });

    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        msg.innerText = "¡Éxito!";
        CodeHero.Managers.UserManager.loadUserProfile(data.user);
    }
};

CodeHero.Managers.UserManager.handleCloudSignup = async function () {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('login-msg');

    if (!email || !password) { msg.innerText = "Ingresa email y contraseña."; return; }

    msg.innerText = "Verificando sistema...";

    // Check Config
    const { data: config } = await CodeHero.Supabase.from('app_settings').select('allow_signup').eq('id', 'config').single();
    if (config && config.allow_signup === false) {
        msg.innerText = "";
        alert("⛔ REGISTRO CERRADO\n\nEl administrador ha desactivado el registro público.");
        return;
    }

    msg.innerText = "Creando cuenta...";
    const { data, error } = await CodeHero.Supabase.auth.signUp({
        email,
        password,
        options: { data: { username: email.split('@')[0] } }
    });

    if (error) {
        msg.innerText = error.message;
    } else {
        msg.innerText = "¡Cuenta creada! Revisa tu email o inicia sesión.";
        // Auto login usually works if email confirm disabled, else wait
        if (data.session) CodeHero.Managers.UserManager.loadUserProfile(data.user);
    }
};



// ... (rest of logic) ...

CodeHero.Managers.UserManager.loadUserProfile = async function (userAuth) {
    console.log("Debug: Loading Profile for", userAuth.id);
    const uid = userAuth.id;

    // CHECK 1: Profile
    let { data: profile, error: profErr } = await CodeHero.Supabase.from('profiles').select('*').eq('id', uid).single();

    // Fallback: Create Profile Client-Side if missing (or trigger failed)
    if (!profile) {
        console.log("Debug: Profile missing, creating client-side...");
        const newProfile = {
            id: uid,
            username: userAuth.user_metadata?.username || 'Hero',
            role: 'hero',
            avatar_svg: ''
        };
        const { error: insertErr } = await CodeHero.Supabase.from('profiles').insert(newProfile);
        if (insertErr) {
            console.error("Debug: Client-side Profile Creation Failed", insertErr);
            alert("Error crítico de perfil: " + insertErr.message);
            return;
        }
        // Retry fetch
        const { data: retryProfile } = await CodeHero.Supabase.from('profiles').select('*').eq('id', uid).single();
        profile = retryProfile;
    }

    if (!profile) {
        alert("No se pudo cargar ni crear el perfil.");
        return;
    }

    console.log("Debug: Profile Loaded", profile);
    const defaultAvatar = { skinColor: 0, top: 0, hairColor: 0, facialHair: 0, facialHairColor: 0, clothing: 4, clothingColor: 4, accessories: 0, accessoriesColor: 0, type: 'human' };
    let loadedAvatar = defaultAvatar;

    // HACK: Extract Config from SVG string (since we lack avatar_config column)
    if (profile.avatar_svg && profile.avatar_svg.includes('<!--config:')) {
        try {
            const parts = profile.avatar_svg.split('<!--config:');
            const jsonStr = parts[1].split('-->')[0];
            loadedAvatar = JSON.parse(jsonStr);
        } catch (e) {
            console.warn("Failed to parse avatar config from SVG", e);
        }
    }

    CodeHero.State.currentUser = {
        name: profile.username || profile.full_name || "Hero",
        avatar: loadedAvatar,
        score: 0,
        maxLevel: 0,
        stars: {},
        id: uid
    };

    // Progress Logic
    const { data: progress } = await CodeHero.Supabase.from('progress').select('*').eq('user_id', uid);
    if (progress) {
        progress.forEach(p => {
            CodeHero.State.currentUser.stars[p.level_id] = p.stars;
            CodeHero.State.currentUser.score += p.score || 0;
            if (p.stars > 0 && p.level_id >= CodeHero.State.currentUser.maxLevel) {
                CodeHero.State.currentUser.maxLevel = p.level_id;
            }
        });
    }

    // Ensure Data is Loaded (Worlds, Phases, Levels)
    try {
        await CodeHero.Managers.DataManager.loadLevels();
    } catch (err) {
        console.error("Failed to load levels:", err);
    }

    CodeHero.UI.DashboardRenderer.updateUserDisplay();
    CodeHero.Managers.UserManager.checkAdminAccess({ ...userAuth, role: profile.role });
    CodeHero.UI.UIRenderer.nav('dash');
}


CodeHero.Managers.UserManager.login = function (idx) {
    CodeHero.Managers.DataManager.loginUser(idx);
    CodeHero.UI.DashboardRenderer.updateUserDisplay();
    CodeHero.UI.UIRenderer.nav('dash');
};

CodeHero.Managers.UserManager.logout = async function () {
    await CodeHero.Supabase.auth.signOut();
    window.location.reload();
};

CodeHero.Managers.UserManager.startCreator = function (isEdit = false) {
    if (!isEdit) {
        CodeHero.State.currentUserIdx = -1;
        CodeHero.State.tempAvatar = { skinColor: 0, top: 0, hairColor: 0, facialHair: 0, facialHairColor: 0, clothing: 4, clothingColor: 4, accessories: 0, accessoriesColor: 0 };
    } else {
        CodeHero.State.tempAvatar = { ...CodeHero.State.currentUser.avatar };
    }
    CodeHero.Managers.UserManager.renderControls();
    CodeHero.Managers.UserManager.updateCreatorPreview(); // Fix: Force initial render
    CodeHero.UI.UIRenderer.nav('creator');
};

CodeHero.Managers.UserManager.checkAdminAccess = function (user) {
    // Check if user has admin privileges to show dev tools
    const isAdmin = (user.role === 'admin') || (user.email && user.email.includes('admin'));

    const devPanel = document.getElementById('dev-tools-panel');
    if (devPanel) {
        devPanel.style.display = isAdmin ? 'block' : 'none';
    }
};

CodeHero.Managers.UserManager.updateCreatorPreview = function () {
    const nameInput = document.getElementById('input-name');
    const seed = (nameInput && nameInput.value) ? nameInput.value : 'robot';
    document.getElementById('creator-svg').innerHTML = CodeHero.UI.drawAvatar(CodeHero.State.tempAvatar, seed);
};

CodeHero.Managers.UserManager.switchTab = function (tabId) {
    CodeHero.State.currentCreatorTab = tabId;
    CodeHero.Managers.UserManager.renderControls();
};

CodeHero.Managers.UserManager.changeType = function (type) {
    CodeHero.State.tempAvatar.type = type;
    if (type === 'bot') {
        if (CodeHero.State.tempAvatar.botColor === undefined) {
            CodeHero.State.tempAvatar = { ...CodeHero.State.tempAvatar, botColor: 0, botTop: 0, botFace: 0, botSides: 0, botTexture: 6 };
        }
    }
    CodeHero.Managers.UserManager.updateCreatorPreview();
    CodeHero.Managers.UserManager.renderControls();
};

CodeHero.Managers.UserManager.changeVal = function (key, dir, max) {
    let v = (CodeHero.State.tempAvatar[key] || 0) + dir;
    if (v < 0) v = max - 1;
    else if (v >= max) v = 0;
    CodeHero.State.tempAvatar[key] = v;
    CodeHero.Managers.UserManager.updateCreatorPreview();
    CodeHero.Managers.UserManager.renderControls();
};

CodeHero.Managers.UserManager.setVal = function (key, val) {
    CodeHero.State.tempAvatar[key] = val;
    CodeHero.Managers.UserManager.updateCreatorPreview();
    CodeHero.Managers.UserManager.renderControls();
};

CodeHero.Managers.UserManager.renderControls = function () {
    const container = document.getElementById('controls-list');
    if (!container) return;
    container.innerHTML = '';

    // 0. SELECTOR DE ESPECIE
    if (!CodeHero.State.tempAvatar.type) CodeHero.State.tempAvatar.type = 'human';

    // Persist Name Logic: Save current input value if it exists, otherwise use state or default
    const currentInput = document.getElementById('input-name');
    if (currentInput) CodeHero.State.tempAvatar.tempName = currentInput.value;
    const nameValue = CodeHero.State.tempAvatar.tempName || (CodeHero.State.currentUserIdx !== -1 ? CodeHero.State.currentUser.name : '');


    const typeSelector = document.createElement('div');
    typeSelector.className = 'type-selector';
    typeSelector.innerHTML = `
        <div class="control-label">ESPECIE</div>
        <div class="type-options" style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;">
            <button class="tab-btn ${CodeHero.State.tempAvatar.type === 'human' ? 'active' : ''}" data-action="changeType" data-value="human">👨 HUMANO</button>
            <button class="tab-btn ${CodeHero.State.tempAvatar.type === 'bot' ? 'active' : ''}" data-action="changeType" data-value="bot">🤖 DROIDE</button>
        </div>
    `;
    container.appendChild(typeSelector);

    // 1. INPUT DE NOMBRE (Estático pero valor dinámico)
    const nameSection = document.createElement('div');
    nameSection.className = 'control-group name-group';
    nameSection.innerHTML = `
        <div class="control-label">NOMBRE DE HÉROE</div>
        <input type="text" id="input-name" class="styled-input" 
               value="${nameValue}" 
               placeholder="${CodeHero.State.tempAvatar.type === 'bot' ? 'ID del Droide...' : 'Escribe tu nombre...'}" autocomplete="off"
               data-action="inputName">
    `;
    container.appendChild(nameSection);

    // 2. TABS
    if (!CodeHero.State.currentCreatorTab) CodeHero.State.currentCreatorTab = 'rasgos';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-header';

    const isBot = CodeHero.State.tempAvatar.type === 'bot';
    const tabs = [
        { id: 'rasgos', label: isBot ? '🔩 Chasis' : '🧬 Rasgos' },
        { id: 'rostro', label: isBot ? '📡 Sensores' : '🧔 Rostro' },
        { id: 'outfit', label: isBot ? '🎨 Acabado' : '👕 Outfit' }
    ];

    tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${CodeHero.State.currentCreatorTab === t.id ? 'active' : ''}`;
        btn.innerText = t.label;
        btn.dataset.action = 'changeTab';
        btn.dataset.tabId = t.id;
        tabsContainer.appendChild(btn);
    });
    container.appendChild(tabsContainer);

    // 3. CONTROLES
    const currentType = CodeHero.State.tempAvatar.type;
    const activeGroups = CodeHero.Config.CONTROL_GROUPS.filter(g =>
        g.tab === CodeHero.State.currentCreatorTab &&
        (g.usage === currentType || !g.usage)
    );

    activeGroups.forEach(group => {
        const div = document.createElement('div'); div.className = 'control-group';
        div.innerHTML = `<div class="control-label">${group.label}</div>`;
        const key = group.id;

        if (group.type === 'shape') {
            let currentVal = CodeHero.State.tempAvatar[key] || 0;
            let max = CodeHero.UI.ASSETS[key] ? CodeHero.UI.ASSETS[key].length : 0;
            div.innerHTML += `
                <div class="arrow-selector">
                    <button class="btn-arrow" data-action="changeVal" data-key="${key}" data-dir="-1" data-max="${max}">◀</button>
                    <div class="selector-display">Opción ${currentVal + 1}</div>
                    <button class="btn-arrow" data-action="changeVal" data-key="${key}" data-dir="1" data-max="${max}">▶</button>
                </div>`;
        } else {
            let html = '<div class="color-options">';
            const options = CodeHero.UI.ASSETS[key] || [];
            for (let i = 0; i < options.length; i++) {
                const hex = CodeHero.UI.getUIHex(key, i);
                const sel = (CodeHero.State.tempAvatar[key] === i) ? 'selected' : '';
                html += `<div class="color-circle ${sel}" style="background:${hex}" data-action="setVal" data-key="${key}" data-val="${i}"></div>`;
            }
            html += '</div>';
            div.innerHTML += html;
        }
        container.appendChild(div);
    });
};

CodeHero.Managers.UserManager.saveUser = async function () {
    const name = document.getElementById('input-name').value || "Héroe";
    const newAvatar = { ...CodeHero.State.tempAvatar };

    // 1. Update Local State
    CodeHero.State.currentUser.name = name;
    CodeHero.State.currentUser.avatar = newAvatar;

    // 2. Generate SVG for Admin/Display
    const svgBase = CodeHero.UI.drawAvatar(newAvatar, name);
    // HACK: Embed header config into the SVG string for persistence
    const encodedConfig = JSON.stringify(newAvatar);
    const svgStorage = `${svgBase}<!--config:${encodedConfig}-->`;

    // 3. Save to Supabase
    const { data: { session } } = await CodeHero.Supabase.auth.getSession();
    if (session && session.user) {
        // CHECK UNIQUENESS
        const { data: existing } = await CodeHero.Supabase
            .from('profiles')
            .select('id')
            .eq('username', name)
            .neq('id', session.user.id)
            .single();

        if (existing) {
            alert("⛔ Ese nombre ya está en uso. Por favor elige otro.");
            return;
        }

        const updates = {
            id: session.user.id,
            username: name,
            // avatar_config: newAvatar, // REMOVED: Column does not exist
            avatar_svg: svgStorage,      // Store visual + config
            // updated_at: new Date()    // REMOVED: Column does not exist
        };

        const { error } = await CodeHero.Supabase.from('profiles').upsert(updates);
        if (error) {
            console.error("Error saving to Supabase:", error);
            alert("Error al guardar en la nube: " + error.message);
        }
    }

    CodeHero.Managers.DataManager.saveData(); // Keep local sync just in case
    CodeHero.UI.DashboardRenderer.updateUserDisplay();
    CodeHero.UI.UIRenderer.nav('dash');
};

CodeHero.Managers.UserManager.showLeaderboard = function () {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    // Mix current user with DB users (bots/others)
    let allUsers = [];
    if (CodeHero.State.db && CodeHero.State.db.users) {
        allUsers = [...CodeHero.State.db.users];
    }

    // Remove if duplicates (by ID or name)
    allUsers = allUsers.filter(u => u.id !== CodeHero.State.currentUser.id && u.name !== CodeHero.State.currentUser.name);

    // Add Current User
    allUsers.push(CodeHero.State.currentUser);

    const sortedUsers = allUsers.sort((a, b) => b.score - a.score);

    sortedUsers.forEach((u, idx) => {
        const d = document.createElement('div');
        let rankClass = '';
        let rankIcon = `#${idx + 1}`;
        if (idx === 0) { rankClass = 'top-1'; rankIcon = '🥇'; }
        if (idx === 1) { rankClass = 'top-2'; rankIcon = '🥈'; }
        if (idx === 2) { rankClass = 'top-3'; rankIcon = '🥉'; }

        d.className = `card leaderboard-item ${rankClass}`;
        d.innerHTML = `
            <div style="font-size:1.5rem; font-weight:bold; width:40px; text-align:center">${rankIcon}</div>
            <div style="width:50px;height:50px;border-radius:50%;overflow:hidden;background:#333;border:2px solid rgba(255,255,255,0.2)">${CodeHero.UI.drawAvatar(u.avatar, u.name)}</div>
            <div style="flex:1">
                <div style="font-weight:bold; font-size:1.1rem; color:${u.isBot ? 'var(--secondary)' : 'white'}">${u.name} ${u.isBot ? '🤖' : ''}</div>
                <div style="font-size:0.8rem; color:var(--text-muted)">Nivel ${u.maxLevel}</div>
            </div>
            <div style="text-align:right">
                <div style="color:var(--primary); font-weight:bold; font-size:1.2rem">${u.score}</div>
                <div style="font-size:0.7rem; color:var(--text-muted)">PTS</div>
            </div>
        `;
        list.appendChild(d);
    });
    CodeHero.UI.UIRenderer.nav('leaderboard');
};

CodeHero.Managers.UserManager.unlockAllLevels = function () {
    const LEVELS = CodeHero.Data.LEVELS;
    CodeHero.State.currentUser.maxLevel = LEVELS.length - 1;
    LEVELS.forEach(l => { if (!CodeHero.State.currentUser.stars[l.id]) CodeHero.State.currentUser.stars[l.id] = 3; });
    CodeHero.Managers.DataManager.saveData();
    CodeHero.Managers.DataManager.saveData();
    CodeHero.UI.UIRenderer.showModal("GOD MODE ⚡", "¡Todos los niveles desbloqueados! Disfruta.");
    CodeHero.UI.DashboardRenderer.renderMap();
};

CodeHero.Managers.UserManager.forceAppUpdate = function () {
    CodeHero.UI.UIRenderer.showModal("¿ACTUALIZAR?", "Esto recargará la aplicación y borrará la caché. ¿Seguir?", async () => {
        const btn = document.querySelector('#generic-modal-actions button');
        if (btn) btn.innerText = "REFRESCANDO... ⏳"; // Visual feedback

        if ('serviceWorker' in navigator) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        }
        // Small delay to ensure FS/Cache operations settle
        setTimeout(() => window.location.reload(true), 200);
    }, true);
};
