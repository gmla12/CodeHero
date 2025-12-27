// Module: Admin Bots
// Extends AdminApp with Bot Management

AdminApp.prototype.renderBots = async function () {
    const container = document.getElementById('view-bots');
    if (!container) return;

    // Fetch Bots if not loaded (or force reload for fresh status)
    // Note: view-bots container is cleaner, we inject content there.
    // We will ignore the #list-bots table from HTML and overwrite container.

    const { data: bots, error } = await supabase.from('profiles').select('*').eq('is_bot', true).order('bot_score', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="error">Error cargando bots: ${error.message}</p>`;
        return;
    }

    // --- RENDER ---
    let html = `
            <div class="toolbar" style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">
                <input type="text" id="filter-bots" placeholder="🔍 Buscar Bot..." style="flex:1; padding:10px; border-radius:6px; border:1px solid #444; background:#222; color:white;">
                <button class="btn-primary" id="btn-create-bot" style="padding:10px 20px;">+ Nuevo Bot</button>
            </div>
            
            <div class="bots-grid" id="bots-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
                <!-- Bots injected here -->
            </div>
        `;

    container.innerHTML = html;

    const listEl = document.getElementById('bots-list');

    const renderList = (filter = "") => {
        listEl.innerHTML = "";
        const filtered = bots.filter(b => (b.username || "").toLowerCase().includes(filter.toLowerCase()));

        // Update Count
        const countEl = document.getElementById('count-bots');
        if (countEl) countEl.innerText = `${filtered.length} de ${bots.length}`;

        if (filtered.length === 0) {
            listEl.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#888;">No se encontraron bots.</p>`;
            return;
        }

        filtered.forEach(bot => {
            const card = document.createElement('div');
            card.className = "card bot-card";
            card.style.cssText = "background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:15px; transition:transform 0.2s;";
            card.innerHTML = `
                    <div class="bot-header" style="display:flex; align-items:center; gap:15px;">
                        <div class="avatar-preview" style="width:50px; height:50px; background:#111; border-radius:50%; overflow:hidden; border:2px solid ${bot.is_active ? 'var(--success)' : '#666'}">
                             ${window.CodeHero.UI.drawAvatar ? window.CodeHero.UI.drawAvatar(this.parseAvatar(bot.avatar_svg), bot.username) : '🤖'}
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:1.1rem;">${bot.username}</h3>
                            <small style="color:${bot.is_active ? 'var(--success)' : '#666'}">
                                ${bot.is_active ? '● Activo' : '○ Inactivo'}
                            </small>
                        </div>
                        <div style="margin-left:auto; font-weight:bold; font-size:1.2rem; color:var(--primary)">
                            ${bot.bot_score} pts
                        </div>
                    </div>
                    <div class="bot-actions" style="display:flex; gap:10px; margin-top:auto;">
                        <button class="btn-secondary btn-edit-bot" data-id="${bot.id}" style="flex:1; padding:8px;">✏️ Editar</button>
                        <button class="btn-secondary btn-toggle-bot" data-id="${bot.id}" data-active="${bot.is_active}" style="padding:8px; border-color:${bot.is_active ? 'var(--danger)' : 'var(--success)'}; color:${bot.is_active ? 'var(--danger)' : 'var(--success)'}">
                            ${bot.is_active ? 'Pausar' : 'Activar'}
                        </button>
                    </div>
                `;
            listEl.appendChild(card);
        });

        // Bind Events
        document.querySelectorAll('.btn-edit-bot').forEach(btn =>
            btn.onclick = () => {
                const bot = bots.find(b => b.id == btn.dataset.id);
                // Use a proper edit call
                app.switchView('edit-bot', bot.id);
            }
        );
        document.querySelectorAll('.btn-toggle-bot').forEach(btn =>
            btn.onclick = () => this.toggleBot(btn.dataset.id, btn.dataset.active !== 'true') // Toggle logic
        );
    };

    renderList();

    // Bind Search
    document.getElementById('filter-bots').addEventListener('input', (e) => renderList(e.target.value));
    document.getElementById('btn-create-bot').addEventListener('click', () => app.switchView('edit-bot'));
};

AdminApp.prototype.parseAvatar = function (svgString) {
    try {
        if (svgString && svgString.includes('<!--config:')) {
            const jsonStr = svgString.split('<!--config:')[1].split('-->')[0];
            return JSON.parse(jsonStr);
        }
    } catch (e) { console.error(e); }
    return { type: 'bot', botColor: 0, botTop: 0, botFace: 0 };
};

AdminApp.prototype.renderBotEditor = async function (id) {
    const container = document.getElementById('view-editor-content');
    container.innerHTML = '<h2>Cargando...</h2>';

    let bot = {
        username: 'Nuevo Bot',
        bot_score: 1000,
        is_active: true,
        avatar_svg: '',
        is_bot: true
    };

    let headerTitle = "Crear Nuevo Bot";

    if (id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) {
            bot = data;
            headerTitle = `Editar: ${bot.username}`;
        }
    }

    const avatarConfig = this.parseAvatar(bot.avatar_svg);

    container.innerHTML = `
        <div class="editor-header">
            <h2>🤖 ${headerTitle}</h2>
            <div class="actions">
                <button class="btn-secondary" onclick="app.switchView('bots')">Cancelar</button>
                <button class="btn-primary" onclick="app.saveBot('${id || ''}')">💾 Guardar</button>
            </div>
        </div>

        <div class="form-grid" style="grid-template-columns: 300px 1fr;">
            <!-- Left: Preview -->
            <div class="card" style="text-align:center">
                <div id="bot-preview" style="width:150px;height:150px;margin:auto;border-radius:50%;overflow:hidden;background:#222;border:4px solid var(--primary)">
                    ${window.CodeHero.UI.drawAvatar(avatarConfig, bot.username)}
                </div>
                <p style="margin-top:10px;color:#aaa">Vista Previa</p>
                <div style="font-size:0.8rem; color:#666; margin-top:10px">
                    Nota: Los bots requieren un ID único.<br>Al crear uno nuevo, se generará autom.
                </div>
            </div>

            <!-- Right: Fields -->
            <div class="card">
                <div class="form-group">
                    <label>Nombre del Bot</label>
                    <input type="text" id="inp-bot-name" value="${bot.username}" placeholder="Ej. Terminator">
                </div>
                <div class="form-group">
                    <label>Factor Competitivo (%)</label>
                    <input type="number" id="inp-bot-score" value="${bot.bot_score}">
                    <div style="font-size:0.8rem; color:#aaa; margin-top:5px; line-height:1.4">
                        ℹ️ <b>Dinámico:</b> Este valor representa el <b>%</b> respecto al mejor jugador humano.<br>
                        • 100 = Iguala al líder.<br>
                        • 110 = Supera al líder por 10%.<br>
                        • 80 = Se mantiene al 80% del líder.
                    </div>
                </div>
                <div class="form-group">
                    <label>Apariencia (Configuración Manual)</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                         <div>
                            <label>Color (0-5)</label>
                            <input type="number" id="inp-bot-color" value="${avatarConfig.botColor || 0}" min="0" max="5" onchange="app.updateBotPreview()">
                         </div>
                         <div>
                            <label>Cabeza/Top (0-5)</label>
                            <input type="number" id="inp-bot-top" value="${avatarConfig.botTop || 0}" min="0" max="5" onchange="app.updateBotPreview()">
                         </div>
                         <div>
                            <label>Rostro (0-5)</label>
                            <input type="number" id="inp-bot-face" value="${avatarConfig.botFace || 0}" min="0" max="5" onchange="app.updateBotPreview()">
                         </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

AdminApp.prototype.updateBotPreview = function () {
    const cfg = {
        type: 'bot',
        botColor: parseInt(document.getElementById('inp-bot-color').value) || 0,
        botTop: parseInt(document.getElementById('inp-bot-top').value) || 0,
        botFace: parseInt(document.getElementById('inp-bot-face').value) || 0,
        botSides: 0,
        botTexture: 0
    };
    const name = document.getElementById('inp-bot-name').value;
    document.getElementById('bot-preview').innerHTML = window.CodeHero.UI.drawAvatar(cfg, name);
};

AdminApp.prototype.saveBot = async function (id) {
    const name = document.getElementById('inp-bot-name').value;
    const score = document.getElementById('inp-bot-score').value;

    if (!name) return alert("El nombre es requerido");

    const cfg = {
        type: 'bot',
        botColor: parseInt(document.getElementById('inp-bot-color').value) || 0,
        botTop: parseInt(document.getElementById('inp-bot-top').value) || 0,
        botFace: parseInt(document.getElementById('inp-bot-face').value) || 0,
        botSides: 0,
        botTexture: 6
    };
    const svgBase = window.CodeHero.UI.drawAvatar(cfg, name);
    const avatar_svg = `${svgBase}<!--config:${JSON.stringify(cfg)}-->`;

    const payload = {
        username: name,
        bot_score: parseInt(score),
        is_bot: true,
        avatar_svg: avatar_svg,
        is_active: true
    };

    let err;
    if (id) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', id);
        err = error;
    } else {
        // Create New Bot
        // Since we cannot create 'auth' users from client easily, we rely on 'profiles' NOT enforcing FK 
        // OR we use a special RPC 'create_bot_profile'. 
        // Given we didn't remove the FK yet, this might fail unless we added the seed logic.
        // I'll try inserting with a random UUID.

        const newId = crypto.randomUUID();
        payload.id = newId;

        // Try direct insert (will fail if FK is Strict and no Auth user exists)
        // I will add a 'create_bot' RPC to schema in next step to fix this properly.
        const { error } = await supabase.rpc('create_bot', payload);
        err = error;

        // Fallback if RPC doesn't exist yet (during prototyping)
        if (err && err.message.includes('function public.create_bot() does not exist')) {
            const { error: insertErr } = await supabase.from('profiles').insert(payload);
            err = insertErr;
        }
    }

    if (err) {
        alert("Error: " + err.message);
    } else {
        this.switchView('bots');
    }
};

AdminApp.prototype.toggleBot = async function (id, isActive) {
    const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
    if (error) alert(error.message);
    else this.renderBots();
};
