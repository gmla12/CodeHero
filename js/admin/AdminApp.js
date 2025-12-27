import { supabase } from '../services/supabase.js';
import { createClient } from '@supabase/supabase-js';

class AdminApp {
    constructor() {
        this.currentEditType = null;
        this.currentEditId = null;
        this.currentContext = null;
        this.filtersBound = false;

        // Initialize Arrays to avoid undefined errors
        this.users = [];
        this.levels = [];
        this.worlds = [];
        this.phases = [];

        this.init();
    }

    async init() {
        try {
            // Check Session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                this.showLogin();
            } else {
                // Check Role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    // Hide Login explicitly (overriding CSS failsafe)
                    const login = document.getElementById('admin-login');
                    if (login) login.style.setProperty('display', 'none', 'important');

                    const app = document.getElementById('admin-app');
                    if (app) app.style.setProperty('display', 'flex', 'important'); // Unlock UI
                    if (app) app.style.filter = 'none';

                    // Show Dashboard and load data
                    await this.showDashboard(session.user);
                } else {
                    alert('Acceso Denegado. No eres Admin.');
                    await supabase.auth.signOut();
                    this.showLogin();
                }
            }
            this.bindEvents();
        } catch (err) {
            console.error(err);
            alert("Error Iniciando Admin: " + err.message);
        }
    }

    bindEvents() {
        // Login & Logout
        document.getElementById('btn-login')?.addEventListener('click', this.handleLogin.bind(this));
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
                // Badge Update
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Create Buttons
        // Create Buttons
        document.getElementById('btn-add-level')?.addEventListener('click', () => this.switchView('edit-level'));
        document.getElementById('btn-add-world')?.addEventListener('click', () => this.switchView('edit-world'));
        document.getElementById('btn-add-type')?.addEventListener('click', () => this.switchView('edit-type'));

        // Modal Actions
        document.getElementById('btn-modal-cancel')?.addEventListener('click', this.closeModal.bind(this));
        document.getElementById('btn-modal-save')?.addEventListener('click', this.saveModal.bind(this));



        // Seeding
        document.getElementById('btn-seed-db')?.addEventListener('click', this.seedDatabase.bind(this));
    }

    async seedDatabase() {
        if (!confirm("⚠️ Esto subirá los datos y REESTRUCTURARÁ la DB.\n¿Continuar?")) return;
        const levels = window.CodeHero.Data.LEVELS || [];

        // 1. Create World 1
        console.log("Creating World...");
        const worldData = { id: 1, title: 'Mundo 1: Lógica & Algoritmos', description: 'Fundamentos de la programación.' };
        await supabase.from('worlds').upsert(worldData);

        // 2. Create Phases
        console.log("Creating Phases...");
        const phases = [
            { id: 1, world_id: 1, title: 'Fase 1: Secuenciación', description: 'Primeros pasos' },
            { id: 2, world_id: 1, title: 'Fase 2: Orientación', description: 'Giros' },
            { id: 3, world_id: 1, title: 'Fase 3: Bucles & Patrones', description: 'Repetición' },
            { id: 4, world_id: 1, title: 'Fase 4: Estado (Llaves)', description: 'Condicionales' },
            { id: 5, world_id: 1, title: 'Fase 5: Lógica Avanzada', description: 'Portales' }
        ];

        for (let p of phases) {
            await supabase.from('phases').upsert(p);
        }

        // 3. Upload Levels with Phase Mapping
        console.log("Uploading Levels...");
        for (let l of levels) {
            let phaseId = 1;
            // Determine Phase based on Level ID ranges (approximate based on levels.js)
            if (l.id >= 2 && l.id <= 4) phaseId = 2; // Orientación
            if (l.id >= 5 && l.id <= 7) phaseId = 3; // Bucles
            if (l.id >= 8 && l.id <= 9) phaseId = 4; // Llaves
            if (l.id >= 10) phaseId = 5; // Avanzada

            const payload = {
                id: l.id + 1, // Keep +1 offset logic? Or keep 0? Supabase identity usually starts at 1. Let's use id+1 to be safe.
                title: l.title,
                type: l.type,
                description: l.description,
                map: l.map,
                start_pos: l.start,
                end_pos: l.end,
                perfect_score: l.perfect,
                phase_id: phaseId,
                hint: "Analiza el patrón...", // Default hint
                stars_2_threshold: Math.ceil(l.perfect * 1.5),
                stars_1_threshold: Math.ceil(l.perfect * 2)
            };

            const { error } = await supabase.from('levels').upsert(payload);
            if (error) console.error("Error level", l.title, error);
        }

        alert("¡Base de datos reestructurada con éxito!");
        window.location.reload();
    }

    // --- Views ---

    currentContext = null; // Store context like worldId

    updateActiveNav(viewId) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });
    }

    async switchView(viewName, editId = null, context = null) { // editId param added
        this.currentContext = context;
        // Hide ALL views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

        // Handle Editor Views as Special Cases
        if (viewName.startsWith('edit-')) {
            const type = viewName.split('-')[1]; // level, phase, world
            this.renderEditor(type, editId);
            document.getElementById('view-editor').classList.add('active');
            document.getElementById('page-title').textContent = editId ? `Editar ${type} ` : `Crear ${type} `;
            document.getElementById('page-actions').innerHTML = `<button class="btn-secondary" id="btn-back">⬅️ Volver</button>`;

            // Smart Back Navigation
            if (this.currentContext && this.currentContext.worldId && type === 'phase') {
                // Return to World Editor
                document.getElementById('btn-back').addEventListener('click', () => this.switchView('edit-world', this.currentContext.worldId));
            } else {
                // Default
                const backTarget = (type === 'phase' || type === 'world') ? 'phases' : type + 's';
                document.getElementById('btn-back').addEventListener('click', () => this.switchView(backTarget));
            }
            return;
        }

        // Settings View
        if (viewName === 'settings') {
            this.renderSettings();
            document.getElementById('view-settings')?.classList.add('active');
            document.getElementById('page-title').textContent = 'Configuración';
            document.getElementById('page-actions').innerHTML = '';
            return;
        }

        // Standard Views
        const viewId = 'view-' + viewName;
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        this.updateActiveNav(viewName.replace(/s$/, '')); // nav highlights base name (e.g., 'levels' -> 'level')

        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            let title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
            if (viewName === 'phases') title = 'Mundos'; // Correction, though phases view is removed
            if (viewName === 'worlds') title = 'Mundos';
            titleEl.textContent = title;
        }

        // Restore Default Actions
        const actions = document.getElementById('page-actions');
        if (actions) {
            if (viewName === 'dashboard') actions.innerHTML = '<button class="btn-secondary" id="btn-seed-db" title="Importar Niveles Locales">🔄 Restaurar Datos</button>';
            else actions.innerHTML = '';
        }

        // Re-bind Seed Listener if dashboard
        if (viewName === 'dashboard') document.getElementById('btn-seed-db')?.addEventListener('click', this.seedDatabase.bind(this));

        await this.loadData(); // Load data for all views

        if (viewName === 'levels') this.renderLevels();
        else if (viewName === 'phases') {
            // Redirect phases to worlds as well, or just show worlds
            this.switchView('worlds');
            return;
        }
        else if (viewName === 'worlds') this.renderWorlds();
        else if (viewName === 'types') this.renderTypes();
        else if (viewName === 'users') this.renderUsers();
    }

    async loadData() {
        const { data: users } = await supabase.from('profiles').select('*');
        const { data: levels } = await supabase.from('levels').select('*').order('id');
        const { data: worlds } = await supabase.from('worlds').select('*').order('id');
        const { data: phases } = await supabase.from('phases').select('*').order('order_index');
        const { data: types } = await supabase.from('level_types').select('*').order('id');

        this.users = users || [];
        this.levels = levels || [];
        this.worlds = worlds || [];
        this.phases = phases || [];
        this.levelTypes = types || [];

        // Populate World Filter in Levels View if not already done
        const wFilter = document.getElementById('filter-levels-world');
        if (wFilter && wFilter.options.length <= 1) { // Keep "Todos"
            this.worlds.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.title;
                wFilter.appendChild(opt);
            });
        }

        // Bind Filter Events (Once)
        if (!this.filtersBound) {
            document.getElementById('filter-levels-search')?.addEventListener('input', () => this.renderLevels());
            document.getElementById('filter-levels-world')?.addEventListener('change', () => this.renderLevels());
            document.getElementById('filter-worlds-search')?.addEventListener('input', () => this.renderWorlds());
            document.getElementById('filter-types-search')?.addEventListener('input', () => this.renderTypes());
            document.getElementById('filter-users-search')?.addEventListener('input', () => this.renderUsers());
            this.filtersBound = true;
        }

        this.updateStats(); // Assuming updateStats exists elsewhere or will be added
    }

    // --- Renders ---

    renderTypes() {
        const list = document.getElementById('list-types');
        if (!list) return;
        list.innerHTML = '';

        const search = document.getElementById('filter-types-search')?.value.toLowerCase() || '';
        const filtered = this.levelTypes.filter(t => t.name.toLowerCase().includes(search));

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><small>${t.id}</small></td>
                <td><span style="display:inline-block; width:12px; height:12px; background:${t.color || '#fff'}; border-radius:50%; margin-right:5px"></span>${t.name}</td>
                <td><code>${t.color}</code></td>
                <td>${t.slug || '-'}</td>
                <td>
                    <button class="btn-sm btn-edit" data-type="type" data-id="${t.id}" title="Editar">✏️</button>
                    <button class="btn-sm btn-del" data-type="type" data-id="${t.id}" title="Eliminar">🗑️</button>
                </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    }

    renderLevels() {
        const list = document.getElementById('list-levels');
        if (!list) return;
        list.innerHTML = '';

        // Filtering
        const search = document.getElementById('filter-levels-search')?.value.toLowerCase() || '';
        const wId = document.getElementById('filter-levels-world')?.value;

        const filtered = this.levels.filter(l => {
            const matchesSearch = l.title.toLowerCase().includes(search) || l.id.toString().includes(search);

            // For world filter, we need to find the world via the phase
            // level -> phase_id -> phase -> world_id
            let matchesWorld = true;
            if (wId) {
                const phase = this.phases.find(p => p.id === l.phase_id);
                matchesWorld = phase && phase.world_id == wId;
            }
            return matchesSearch && matchesWorld;
        });

        filtered.forEach(l => {
            const tr = document.createElement('tr');
            // Resolve World Name
            let worldName = '-';
            const phase = this.phases.find(p => p.id === l.phase_id);
            if (phase) {
                const world = this.worlds.find(w => w.id === phase.world_id);
                if (world) worldName = world.title;
            }

            tr.innerHTML = `<td><small>${l.id}</small></td><td>${l.title}</td><td>${l.type || '-'}</td><td><small>${worldName}</small></td><td>
                <button class="btn-sm btn-edit" data-type="level" data-id="${l.id}" title="Editar">✏️</button>
                <button class="btn-sm btn-del" data-type="level" data-id="${l.id}" title="Eliminar">🗑️</button>
            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    }

    renderWorlds() {
        const list = document.getElementById('list-worlds');
        if (!list) return;
        list.innerHTML = '';

        const search = document.getElementById('filter-worlds-search')?.value.toLowerCase() || '';
        const data = this.worlds || []; // Safety
        const filtered = data.filter(w => (w.title || '').toLowerCase().includes(search));

        filtered.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><small>${w.id}</small></td><td>${w.title}</td><td>${w.description}</td><td>
                 <button class="btn-sm btn-edit" data-type="world" data-id="${w.id}" title="Editar">✏️</button>
                 <button class="btn-sm btn-del" data-type="world" data-id="${w.id}" title="Eliminar">🗑️</button>
            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    }

    // Removing renderPhases as user requested simplification




    async renderUsers() {
        const { data } = await supabase.from('profiles').select('*');
        const list = document.getElementById('list-users');
        if (!list) return;
        list.innerHTML = '';

        // Add User Button Logic
        const toolbar = document.querySelector('#view-users .table-container').previousElementSibling || document.createElement('div');
        if (!toolbar.classList.contains('toolbar')) {
            // Need to insert logic if it doesn't exist, but HTML has div inside view-users ?
            // Let's just create a button on top if not exists
            const existingBtn = document.getElementById('btn-add-user');
            if (!existingBtn) {
                const btn = document.createElement('button');
                btn.className = 'btn-primary';
                btn.id = 'btn-add-user';
                btn.textContent = '+ Nuevo Usuario';
                btn.style.marginBottom = '10px';
                btn.addEventListener('click', () => this.switchView('edit-user'));
                list.parentElement.parentElement.insertBefore(btn, list.parentElement);
            }
        }

        const search = document.getElementById('filter-users-search')?.value.toLowerCase() || '';

        const filtered = this.users.filter(u => {
            const displayName = (u.username || u.full_name || u.email || '').toLowerCase();
            const role = (u.role || '').toLowerCase();
            return displayName.includes(search) || u.id.includes(search) || role.includes(search);
        });

        filtered.forEach(u => {
            const tr = document.createElement('tr');
            const displayName = u.username || u.full_name || u.email;
            // Highlight Admin Role
            const roleBadge = u.role === 'admin' ? '<span style="color:var(--gold)">admin</span>' : u.role;

            tr.innerHTML = `<td><small>${u.id}</small></td><td>${displayName}</td><td>${roleBadge}</td><td>
                <button class="btn-sm btn-edit" data-type="user" data-id="${u.id}" title="Editar">✏️</button>
                <button class="btn-sm btn-del" data-type="user" data-id="${u.id}" title="Eliminar">🗑️</button>
            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    }

    bindListActions(container) {
        // Remove old listeners (cloning) to prevent duplicates if any?
        // Actually, delegation is better.
        // We assume 'container' is the parent (like tbody or view div)

        // Remove previous listener if possible? Hard with anonymous functions.
        // Instead, we will rely on keydown/click on the container only.

        // Let's use a flag or just overwrite the innerHTML (which we do) cleans up old listeners on elements.
        // But if we bind to 'container' which is persistent...

        // Simplest Robust approach: Bind to individual elements but ensure we generate fresh ones.
        // The issue 'alerts keep appearing' suggests multiple listeners execution.
        // This validates the move to stopping propagation.

        // Let's try explicit delegation on the CONTAINER level (passed in is usually the View or TBODY)
        // If it's a TBODY, it gets replaced every render, so individual listeners are fine.
        // If it's the View Div, it stays. Renders replace content.

        // The previous code passed 'view' or 'list' (tbody).
        // renderWorlds passes 'view' (DIV).
        // renderUsers passes 'list' (TBODY).
        // renderLevels passes 'list' (TBODY).

        // Consistency: Let's bind directly to the buttons for simplicity but add stopImmediatePropagation

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = (e) => { // Use onclick property to ensure single listener
                e.preventDefault();
                e.stopPropagation();
                this.switchView('edit-' + btn.dataset.type, btn.dataset.id);
            };
        });

        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Nuclear option against bubbling
                // Decouple from event loop to prevent UI glitches with alert/confirm
                setTimeout(() => this.deleteItem(btn.dataset.id, btn.dataset.type), 50);
            };
        });
    }

    async deleteItem(id, type, name = "Item") {
        if (!confirm(`¿Eliminar ${name}? Esta acción es irreversible.`)) return;

        // Validation Check Logic if needed
        if (!await this.checkDependencies(type, id)) return; // Changed validateDelete to checkDependencies

        let table = type + 's';
        if (type === 'user') table = 'profiles'; // Fix: Map 'user' -> 'profiles'

        let error = null;

        if (type === 'user') {
            // Use RPC for safe Auth + Profile delete
            const { error: rpcErr } = await supabase.rpc('delete_user_admin', { target_user_id: id });
            error = rpcErr;
        } else {
            const { error: delErr } = await supabase.from(table).delete().eq('id', id);
            error = delErr;
        }

        if (error) {
            alert("Error al eliminar: " + error.message);
        } else {
            alert("Eliminado.");
            // Refresh
            if (this.currentContext && this.currentContext.worldId && type === 'phase') {
                // Refresh Phases
                this.loadPhasesForSelect(null, this.currentContext.worldId);
                // We need to re-render the list... tricky here as we don't know the exact view logic without refreshing.
                // Easiest is to reload the current list.
                this.switchView('edit-world', this.currentContext.worldId);
            } else {
                this.switchView(type === 'phase' ? 'worlds' : type + 's');
            }
        }
    }

    showConfirm(message) {
        return new Promise((resolve) => {
            let modal = document.getElementById('confirm-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'confirm-modal';
                modal.className = 'modal-overlay'; // Re-use existing overlay class
                modal.style.display = 'none';
                modal.innerHTML = `
    < div class="modal-wrapper" style = "max-width:400px; text-align:center" >
                        <h3 style="margin-bottom:20px; color:var(--text-color)">⚠️ Confirmación</h3>
                        <p id="confirm-msg" style="margin-bottom:30px; color:var(--text-muted)"></p>
                        <div style="display:flex; justify-content:center; gap:15px">
                            <button class="btn-secondary" id="btn-confirm-no">Cancelar</button>
                            <button class="btn-primary" id="btn-confirm-yes" style="background:var(--danger, #ff4444)">Eliminar</button>
                        </div>
                    </div >
    `;
                document.body.appendChild(modal);
            }

            const msgEl = modal.querySelector('#confirm-msg');
            const btnYes = modal.querySelector('#btn-confirm-yes');
            const btnNo = modal.querySelector('#btn-confirm-no');

            msgEl.textContent = message;
            modal.style.display = 'flex';

            // Clean up old listeners
            const newYes = btnYes.cloneNode(true);
            const newNo = btnNo.cloneNode(true);
            btnYes.parentNode.replaceChild(newYes, btnYes);
            btnNo.parentNode.replaceChild(newNo, btnNo);

            newYes.onclick = () => {
                modal.style.display = 'none';
                resolve(true);
            };

            newNo.onclick = () => {
                modal.style.display = 'none';
                resolve(false);
            };
        });
    }

    async checkDependencies(type, id) {
        if (type === 'world') {
            const { count, error } = await supabase.from('phases').select('*', { count: 'exact', head: true }).eq('world_id', id);
            if (count > 0) {
                alert(`⚠️ NO SE PUEDE ELIMINAR.\n\nEste Mundo tiene ${count} Fases asociadas.\nElimina las fases primero.`);
                return false;
            }
        }
        else if (type === 'phase') {
            const { count, error } = await supabase.from('levels').select('*', { count: 'exact', head: true }).eq('phase_id', id);
            if (count > 0) {
                alert(`⚠️ NO SE PUEDE ELIMINAR.\n\nEsta Fase tiene ${count} Niveles asociados.\nElimina o reasigna los niveles primero.`);
                return false;
            }
        }
        return true;
    }

    // --- Editor View (Was Modal) ---
    // We reuse logic but render into #view-editor instead of modal content

    currentEditId = null;
    currentEditType = null;
    currentMap = []; // For Level Editor
    currentTools = { type: 'wall' }; // active tool
    levelMeta = { start: { x: 1, y: 1 }, end: { x: 3, y: 1 } };


    async renderEditor(type, id = null) {
        this.currentEditType = type;
        this.currentEditId = id;

        const container = document.getElementById('view-editor-content'); // We need to add this to HTML
        if (!container) return;
        container.innerHTML = 'Cargando...';

        let data = {};
        if (id) {
            const table = type === 'user' ? 'profiles' : type + 's';
            const { data: fetch } = await supabase.from(table).select('*').eq('id', id).single();
            data = fetch;
        }

        if (type === 'level') {
            // Default Map for New Levels
            if (!data.map) data.map = this.createEmptyMap(10, 5); // 10x5 Default
            this.currentMap = data.map;
            this.levelMeta = {
                start: data.start_pos || { x: 1, y: 1 },
                end: data.end_pos || { x: 3, y: 1 }
            };

            container.innerHTML = `
                <div class="tabs">
                    <button class="tab-btn active" data-tab="gen">General</button>
                    <button class="tab-btn" data-tab="map">Mapa & Diseño</button>
                    <button class="tab-btn" data-tab="log">Lógica & Scoring</button>
                    <button class="btn-primary" id="btn-save-editor" style="margin-left:auto">💾 Guardar Cambios</button>
                </div>

                <div id="tab-gen" class="tab-content active">
                    <div class="form-grid">
                        <div style="grid-column: span 2"><label>Título <input type="text" id="inp-title" value="${data.title || ''}"></label></div>
                        <div style="grid-column: span 2"><label>Descripción <textarea id="inp-desc" rows="2">${data.description || ''}</textarea></label></div>
                        
                        <!-- Cascading Dropdowns -->
                        <label>Mundo <select id="inp-world-filter"><option>Cargando...</option></select></label>
                        <label>Fase <select id="inp-phase"><option>Selecciona Mundo primero...</option></select></label>

                        <label>Tipo <select id="inp-type">
                            ${this.levelTypes.map(t => `<option value="${t.name}" ${data.type === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select></label>
                        <div style="grid-column: span 2"><label>Pista (Ayuda) <input type="text" id="inp-hint" value="${data.hint || ''}" placeholder="Ej: Usa un bucle para..."></label></div>
                    </div>
                </div>

                <div id="tab-map" class="tab-content">
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; height:600px">
                        
                        <!-- LEFT: MAP EDITOR -->
                        <div style="border-right:1px solid #444; padding-right:10px; display:flex; flex-direction:column">
                            <h3 style="margin-top:0">🗺️ Diseño del Mapa</h3>
                            <div style="margin-bottom:10px; display:flex; gap:10px; align-items:center; background:#222; padding:5px 10px; border-radius:8px">
                                <label style="margin:0; color:#fff; font-size:0.8rem">W: <input type="number" id="inp-width" value="${data.map[0].length}" style="width:50px"></label>
                                <label style="margin:0; color:#fff; font-size:0.8rem">H: <input type="number" id="inp-height" value="${data.map.length}" style="width:50px"></label>
                                <button class="btn-sm btn-secondary" id="btn-resize-map">Resize</button>
                            </div>

                            <p style="font-size:0.85rem; color:#aaa; margin-bottom:10px; background:#222; padding:8px; border-radius:5px; border-left:3px solid var(--primary)">
                                ℹ️ <b>Instrucciones:</b> Selecciona una herramienta abajo y haz click en la cuadrícula para editar.
                            </p>

                            <div class="editor-toolbar">
                                <button class="btn-tool active" data-tool="wall" title="Pared (Bloquea el paso)">🧱 Pared</button>
                                <button class="btn-tool" data-tool="eraser" title="Borrador (Piso vacío)">⬜ Borrar</button>
                                <div style="width:1px; background:#444; margin:0 5px"></div>
                                <button class="btn-tool" data-tool="start" title="Inicio (Posición del Robot)">🚩 Inicio</button>
                                <button class="btn-tool" data-tool="end" title="Meta (Bandera Final)">🏁 Meta</button>
                                <div style="width:1px; background:#444; margin:0 5px"></div>
                                <button class="btn-tool" data-tool="key" title="Llave (Necesaria para abrir puertas)">🔑 Llave</button>
                                <button class="btn-tool" data-tool="door" title="Puerta (Requiere llave)">🚪 Puerta</button>
                                <button class="btn-tool" data-tool="portal" title="Portal (Teletransporte)">🌀 Portal</button>
                            </div>
                            <div style="overflow:auto; flex:1; border:1px solid #444; padding:20px; background:#111">
                                <div id="grid-editor" class="grid-editor" style="grid-template-columns: repeat(${data.map[0].length}, 32px);"></div>
                            </div>
                             <p style="font-size:0.7rem; color:#666; text-align:center; margin-top:5px">Click en Items repetidos para alternar estados.</p>
                        </div>

                        <!-- RIGHT: START CODE BUILDER -->
                        <div style="display:flex; flex-direction:column; overflow:hidden">
                            <h3 style="margin-top:0">🧩 Código Inicial (Debugging)</h3>
                            <div style="flex:1; overflow-y:auto; background:#1a1a1a; border:1px solid #444; padding:10px; margin-bottom:10px" id="code-builder-list">
                                <!-- Command Items will be injected here -->
                                <p style="color:#666; text-align:center; margin-top:50px">No hay comandos iniciales</p>
                            </div>
                            
                            <!-- Add Buttons -->
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px">
                                <button class="btn-sm btn-primary" id="btn-add-move">⬆️ Avanzar</button>
                                <button class="btn-sm btn-primary" id="btn-add-turn">🔄 Girar</button>
                                <button class="btn-sm btn-primary" id="btn-add-loop">🔴 Bucle</button>
                                <button class="btn-sm btn-primary" id="btn-add-lock">🔓 Abrir</button>
                            </div>
                             <button class="btn-sm btn-danger" id="btn-clear-code" style="margin-top:5px">🗑️ Limpiar Todo</button>
                        </div>
                    </div>
                </div>

                <div id="tab-log" class="tab-content">
                    <div class="form-grid">
                        <label>⭐ Score Perfecto (Pasos) <input type="number" id="inp-score" value="${data.perfect_score || 10}"></label>
                        <label>⭐⭐ 2 Estrellas (Max Pasos) <input type="number" id="inp-star2" value="${data.stars_2_threshold || 15}"></label>
                        <label>⭐ 1 Estrella (Max Pasos) <input type="number" id="inp-star1" value="${data.stars_1_threshold || 20}"></label>
                        <div style="grid-column:span 2; padding-top:10px">
                            <button class="btn-secondary" id="btn-calc-score" style="width:100%">✨ Auto-Calcular Thresholds</button>
                            <p style="font-size:0.8rem; color:#888; margin-top:5px">Calcula 2 y 1 estrella basado en el score perfecto (+50%, +100%).</p>
                        </div>
                    </div>
                </div>
`;

            // --- INIT STATE ---
            this.startCode = data.start_code || []; // Initialize State

            if (data.type) document.getElementById('inp-type').value = data.type;

            // Resize Map Logic
            document.getElementById('btn-resize-map')?.addEventListener('click', () => {
                const w = parseInt(document.getElementById('inp-width').value) || 10;
                const h = parseInt(document.getElementById('inp-height').value) || 5;
                if (confirm("Cambiar el tamaño puede borrar partes del mapa. ¿Seguro?")) {
                    this.resizeMap(w, h);
                }
            });

            // Bind Save
            document.getElementById('btn-save-editor').addEventListener('click', this.saveModal.bind(this)); // Reusing saveModal logic but triggered by button

            // Start Tab Logic
            this.bindTabLogic(container);

            // Tool Listeners
            this.bindToolLogic(container);

            // Code Builder Listeners
            this.bindCodeBuilderLogic();
            this.renderCodeBuilder(); // Initial Render

            // Load Phases
            this.initLevelEditor(data); // Initialize Cascading Dropdowns

            // Bind Grid Click (Delegation on the new element)
            const gridEl = document.getElementById('grid-editor');
            if (gridEl) {
                gridEl.addEventListener('click', (e) => {
                    const cell = e.target.closest('.grid-cell');
                    if (cell) this.toggleCell(cell);
                });
                // Prevent drag selection
                gridEl.addEventListener('mousedown', e => e.preventDefault());
            }

            this.renderGridEditor();

        } else if (type === 'phase') {
            container.innerHTML = `
    <div class="form-grid">
                    <label>Título <input id="inp-title" value="${data.title || ''}"></label>
                    <label>Mundo 
                        <select id="inp-world"><option>Cargando...</option></select>
                    </label>
                    <div style="grid-column: span 2"><label>Descripción <textarea id="inp-desc">${data.description || ''}</textarea></label></div>
                </div>
    <div style="margin-top:20px; text-align:right">
        <button class="btn-primary" id="btn-save-editor">💾 Guardar Cambios</button>
    </div>
`;
            this.loadWorldsForSelect(data.world_id || (this.currentContext ? this.currentContext.worldId : null));
            document.getElementById('btn-save-editor').addEventListener('click', this.saveModal.bind(this));

        } else if (type === 'world') {
            container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px">
                    <h3>Datos Generales</h3>
                    <label>Título <input type="text" id="inp-title" value="${data.title || ''}"></label>
                    <label>Descripción <textarea id="inp-desc">${data.description || ''}</textarea></label>
                </div>

                <!--Nested Phases List-->
                <div style="margin-top:40px; border-top:1px solid #333; padding-top:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                         <h3>Fases del Mundo</h3>
                         ${id ? `<button class="btn-primary btn-sm" id="btn-add-nested-phase">+ Nueva Fase</button>` : '<small>Guarda el mundo para añadir fases</small>'}
                    </div>
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Título</th><th>Acciones</th></tr></thead>
                        <tbody id="list-world-phases"></tbody>
                    </table>
                </div>

                <div style="margin-top:20px; text-align:right">
                    <button class="btn-primary" id="btn-save-editor">💾 Guardar Cambios</button>
                </div>
`;
            document.getElementById('btn-save-editor').addEventListener('click', this.saveModal.bind(this));

            // Nested Logic
            if (id) {
                const { data: phases } = await supabase.from('phases').select('*').eq('world_id', id).order('id');
                const list = document.getElementById('list-world-phases');
                phases?.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
    <td> ${p.id}</td>
                        <td>${p.title}</td>
                        <td>
                            <button class="btn-sm btn-edit-nested" data-id="${p.id}" title="Editar">✏️</button>
                            <button class="btn-sm btn-del-nested" data-id="${p.id}" title="Eliminar">🗑️</button>
                        </td>`;
                    list.appendChild(tr);
                });

                document.getElementById('btn-add-nested-phase')?.addEventListener('click', () => {
                    this.switchView('edit-phase', null, { worldId: id });
                });

                list.querySelectorAll('.btn-edit-nested').forEach(b => {
                    b.onclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        this.switchView('edit-phase', e.target.dataset.id, { worldId: id });
                    };
                });

                list.querySelectorAll('.btn-del-nested').forEach(b => {
                    b.onclick = (e) => {
                        e.preventDefault(); e.stopImmediatePropagation();
                        setTimeout(() => this.handleDelete('phase', b.dataset.id), 50);
                    };
                });
            }

        } else if (type === 'user') {
            const isNew = !data.id;
            container.innerHTML = `
    <div class="form-grid">
                    <label>Email (Auth) 
                        <div style="display:flex; gap:5px">
                            <input type="text" id="inp-email" value="${data.email || ''}" ${isNew ? '' : 'disabled style="opacity:0.6"'}>
                            ${!isNew ? '<button class="btn-sm btn-secondary" id="btn-change-email" title="Cambiar Email">✏️</button>' : ''}
                        </div>
                    </label>
                    <label>ID <input type="text" value="${data.id || 'Nuevo'}" disabled style="opacity:0.6"></label>
                    
                    ${isNew ?
                    `<label>Contraseña (Requerido) <input type="password" id="inp-password" placeholder="Mínimo 6 caracteres"></label>
                     <label>Confirmar Contraseña <input type="password" id="inp-password-confirm"></label>`
                    :
                    `<div style="grid-column: span 2; margin-bottom:10px;">
                        <button class="btn-secondary" id="btn-reset-pass">📧 Enviar Correo de Reset Password</button>
                     </div>`
                }
                    
                    <label>Usuario (Display) <input id="inp-username" type="text" value="${data.username || data.full_name || ''}"></label>
                    <label>Rol 
                        <select id="inp-role">
                            <option value="user" ${data.role === 'user' ? 'selected' : ''}>Usuario</option>
                            <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </label>

                    <div style="grid-column: span 2">
                        <label>Avatar (Vista Previa)</label>
                        <div style="background:#111; padding:20px; border-radius:12px; display:flex; justify-content:center; align-items:center;">
                            <div style="width:100px; height:100px;">${data.avatar_svg || '<span style="color:#666">Sin Avatar</span>'}</div>
                        </div>
                        <p style="font-size:0.8rem; color:#888; margin-top:5px; text-align:center">El avatar se edita desde la aplicación principal.</p>
                        <!-- Hidden Input for Logic -->
                        <textarea id="inp-avatar" style="display:none">${data.avatar_svg || ''}</textarea>
                    </div>
                    </div>
                </div>
                <div style="margin-top:20px; text-align:right">
                    <button class="btn-primary" id="btn-save-editor">💾 ${isNew ? 'Crear Usuario' : 'Guardar Usuario'}</button>
                </div>
            `;

            document.getElementById('btn-save-editor').addEventListener('click', this.saveModal.bind(this));

            // Actions logic
            if (!isNew) {
                document.getElementById('btn-reset-pass')?.addEventListener('click', async () => {
                    if (confirm(`¿Enviar correo de recuperación a ${data.email}?`)) {
                        const { error } = await supabase.auth.resetPasswordForEmail(data.email);
                        if (error) alert("Error: " + error.message);
                        else alert("Correo enviado.");
                    }
                });

                document.getElementById('btn-change-email')?.addEventListener('click', async () => {
                    const newEmail = prompt("Nuevo Email:", data.email);
                    if (newEmail && newEmail !== data.email) {
                        const { error } = await supabase.rpc('update_user_email_admin', {
                            target_user_id: data.id,
                            new_email: newEmail
                        });
                        if (error) alert("Error actualizando email: " + error.message);
                        else {
                            alert("Email actualizado.");
                            this.renderEditor('user', data.id);
                        }
                    }
                });
            }

        } else if (type === 'type') {
            container.innerHTML = `
                <div class="form-grid">
                    <label>Nombre del Tipo <input type="text" id="inp-name" value="${data.name || ''}" placeholder="Ej: Tutorial"></label>
                    <label>Slug (Icono) <input type="text" id="inp-slug" value="${data.slug || ''}" placeholder="Ej: tutorial"></label>
                    <label>Color (Hex) <input type="color" id="inp-color" value="${data.color || '#ffffff'}" style="height:40px; width:100%"></label>
                    <div style="grid-column: span 2"><label>Descripción <textarea id="inp-desc">${data.description || ''}</textarea></label></div>
                </div>
                <div style="margin-top:20px; text-align:right">
                    <button class="btn-primary" id="btn-save-editor">💾 Guardar Tipo</button>
                </div>
            `;
            document.getElementById('btn-save-editor').addEventListener('click', this.saveModal.bind(this));
        }

        // Actions logic

    }


    bindTabLogic(container) {
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            });
        });
    }

    bindToolLogic(container) {
        container.querySelectorAll('.btn-tool').forEach(b => {
            b.addEventListener('click', (e) => {
                container.querySelectorAll('.btn-tool').forEach(x => x.classList.remove('active'));
                e.target.closest('.btn-tool').classList.add('active');
                this.currentTools.type = e.target.closest('.btn-tool').dataset.tool;
            });
        });

        document.getElementById('btn-calc-score')?.addEventListener('click', () => {
            const perfect = parseInt(document.getElementById('inp-score').value) || 10;
            document.getElementById('inp-star2').value = Math.ceil(perfect * 1.5);
            document.getElementById('inp-star1').value = Math.ceil(perfect * 2.0);
        });
    }

    resizeMap(w, h) {
        let newMap = Array(h).fill().map(() => Array(w).fill(0));
        for (let y = 0; y < Math.min(h, this.currentMap.length); y++) {
            for (let x = 0; x < Math.min(w, this.currentMap[0].length); x++) {
                newMap[y][x] = this.currentMap[y][x];
            }
        }
        this.currentMap = newMap;

        const grid = document.getElementById('grid-editor');
        grid.style.gridTemplateColumns = `repeat(${w}, 32px)`;
        this.renderGridEditor();
    }

    createEmptyMap(cols, rows) {
        return Array(rows).fill().map(() => Array(cols).fill(0));
    }

    async loadWorldsForSelect(selectedId) {
        // Explicitly fetch only items from 'worlds' table
        const { data: worlds } = await supabase.from('worlds').select('id, title').order('id');
        const select = document.getElementById('inp-world');
        if (!select) return;
        select.innerHTML = '<option value="">-- Seleccionar Mundo --</option>';
        worlds?.forEach(w => {
            // Safety check: ensure title doesn't look like a phase if data is mixed (unlikely with strict tables)
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = `[ID: ${w.id}] ${w.title} `;
            if (selectedId && w.id.toString() === selectedId.toString()) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // --- CODE BUILDER LOGIC ---

    bindCodeBuilderLogic() {
        document.getElementById('btn-add-move').onclick = () => { this.startCode.push("moveForward"); this.renderCodeBuilder(); };
        document.getElementById('btn-add-turn').onclick = () => { this.startCode.push("turnLeft"); this.renderCodeBuilder(); }; // Default turn left
        document.getElementById('btn-add-lock').onclick = () => { this.startCode.push("unlock"); this.renderCodeBuilder(); };
        document.getElementById('btn-clear-code').onclick = () => { if (confirm('¿Borrar todo?')) { this.startCode = []; this.renderCodeBuilder(); } };

        document.getElementById('btn-add-loop').onclick = () => {
            const count = prompt("¿Repeticiones del bucle?", "3");
            if (count) {
                this.startCode.push({ type: "loop", count: parseInt(count), cmds: [] });
                this.renderCodeBuilder();
            }
        };
    }

    renderCodeBuilder() {
        const container = document.getElementById('code-builder-list');
        if (!container) return;
        container.innerHTML = '';

        if (this.startCode.length === 0) {
            container.innerHTML = '<p style="color:#666; text-align:center; margin-top:50px">No hay comandos iniciales</p>';
            return;
        }

        const createItem = (cmd, index, parentArray) => {
            const div = document.createElement('div');
            div.style.cssText = "background:#333; margin-bottom:4px; padding:5px; border-radius:4px; font-family:monospace; font-size:0.9rem; display:flex; align-items:center; gap:5px";

            // Icon & Text
            let text = cmd;
            let icon = '🟦';

            if (typeof cmd === 'string') {
                if (cmd === 'moveForward') { text = 'Adelante'; icon = '⬆️'; }
                if (cmd === 'turnLeft') { text = 'Girar Izq'; icon = '↺'; }
                if (cmd === 'turnRight') { text = 'Girar Der'; icon = '↻'; }
                if (cmd === 'unlock') { text = 'Abrir'; icon = '🔓'; }

                div.innerHTML = `<span style="flex:1">${icon} ${text}</span>`;

                // Toggle Turn
                if (cmd.includes('turn')) {
                    const toggleBtn = document.createElement('button');
                    toggleBtn.innerHTML = '⇄';
                    toggleBtn.className = 'btn-xs btn-secondary';
                    toggleBtn.onclick = () => { parentArray[index] = (cmd === 'turnLeft' ? 'turnRight' : 'turnLeft'); this.renderCodeBuilder(); };
                    div.appendChild(toggleBtn);
                }

            } else if (cmd.type === 'loop') {
                div.style.background = '#422'; // Red tint
                div.style.flexDirection = 'column';
                div.style.alignItems = 'stretch';

                // Header
                div.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #633; padding-bottom:5px">
                        <span>🔴 Bucle (${cmd.count}x)</span>
                        <div style="display:flex; gap:5px">
                            <button class="btn-xs btn-add-inner" style="background:#555">+</button>
                            <button class="btn-xs btn-del-loop" style="background:#844">X</button>
                        </div>
                    </div>
    <div class="loop-body" style="padding-left:10px; border-left:2px solid #633"></div>
`;

                const body = div.querySelector('.loop-body');
                cmd.cmds.forEach((subCmd, subIdx) => {
                    body.appendChild(createItem(subCmd, subIdx, cmd.cmds));
                });

                // Events
                div.querySelector('.btn-add-inner').onclick = () => {
                    // Simple logic: Add Move Forward by default to loop, user can't select type easily inside loop yet without complex UI
                    // Let's prompt or simple add
                    const reply = prompt("1: Avanzar, 2: Girar", "1");
                    if (reply === '1') cmd.cmds.push("moveForward");
                    else if (reply === '2') cmd.cmds.push("turnLeft");
                    this.renderCodeBuilder();
                };
                div.querySelector('.btn-del-loop').onclick = () => {
                    parentArray.splice(index, 1);
                    this.renderCodeBuilder();
                };

                return div; // Return early as we handled children
            }

            // Delete Button
            const delBtn = document.createElement('button');
            delBtn.textContent = 'x';
            delBtn.className = 'btn-xs btn-danger';
            delBtn.style.marginLeft = 'auto';
            delBtn.onclick = () => {
                parentArray.splice(index, 1);
                this.renderCodeBuilder();
            };
            div.appendChild(delBtn);

            return div;
        };

        this.startCode.forEach((cmd, idx) => {
            container.appendChild(createItem(cmd, idx, this.startCode));
        });
    }

    renderGridEditor() {
        const grid = document.getElementById('grid-editor');
        if (!grid) return;

        // Ensure we don't duplicate listeners (simple check or re-replace)
        // Since we clear innerHTML, we lose cell listeners if they were individual.
        // Delegation on the parent is best. 
        // We will bind the click ONCE to the parent in bindToolLogic, OR here if we check for existing listener.
        // But renderGridEditor is called multiple times.
        // Best approach: Re-render content, and ensure parent has listener. 
        // The parent #grid-editor is recreated in renderEditor, so we can bind there.

        grid.innerHTML = '';
        this.currentMap.forEach((row, y) => {
            row.forEach((cell, x) => {
                const el = document.createElement('div');
                // Basic classes
                let className = 'grid-cell';
                if (cell === 1) className += ' wall';

                // Overlay Meta
                if (x === this.levelMeta.start.x && y === this.levelMeta.start.y) className += ' start';
                if (x === this.levelMeta.end.x && y === this.levelMeta.end.y) className += ' end';

                // Game Logic Objects
                if (cell === 2) className += ' key';
                if (cell === 3) className += ' door';
                if (cell === 4) className += ' portal';

                el.className = className;
                el.dataset.x = x;
                el.dataset.y = y;

                // Cursor Feedback
                const currentTool = this.currentTools.type;
                if (currentTool === 'eraser') el.style.cursor = 'no-drop';
                else el.style.cursor = 'cell';

                // Icons
                let icon = '';
                if (className.includes('start')) icon = '🚩';
                else if (className.includes('end')) icon = '🏁';
                else if (className.includes('key')) icon = '🔑';
                else if (className.includes('door')) icon = '🚪';
                else if (className.includes('portal')) icon = '🌀';

                el.textContent = icon;

                grid.appendChild(el);
            });
        });
    }

    toggleCell(el) {
        const x = parseInt(el.dataset.x);
        const y = parseInt(el.dataset.y);
        const tool = this.currentTools.type;

        if (tool === 'wall') {
            // Toggle Wall
            const isWall = this.currentMap[y][x] === 1;

            // Clean cell first (remove items if any)
            this.currentMap[y][x] = 0;
            if (this.levelMeta.start.x === x && this.levelMeta.start.y === y) this.levelMeta.start = { x: -1, y: -1 };
            if (this.levelMeta.end.x === x && this.levelMeta.end.y === y) this.levelMeta.end = { x: -1, y: -1 };

            // Set New Value
            if (!isWall) this.currentMap[y][x] = 1;
        }
        else if (tool === 'eraser') {
            this.currentMap[y][x] = 0;
            if (this.levelMeta.start.x === x && this.levelMeta.start.y === y) this.levelMeta.start = { x: -1, y: -1 };
            if (this.levelMeta.end.x === x && this.levelMeta.end.y === y) this.levelMeta.end = { x: -1, y: -1 };
        }
        else {
            // Placing Items (Start, End, Key, Door, Portal)
            // Rule: CANNOT place on Wall. Must erase wall first.
            if (this.currentMap[y][x] === 1) {
                alert("⛔ No puedes colocar objetos sobre una pared. Borra la pared primero.");
                return;
            }

            if (tool === 'start') {
                this.levelMeta.start = { x, y };
                // Ensure no conflicting items in this cell (though strict validation might allow key+start? No, keep simple)
                // Logic: Start/End overlay on Floor(0) is fine.
            }
            else if (tool === 'end') {
                this.levelMeta.end = { x, y };
            }
            else if (tool === 'key') {
                this.currentMap[y][x] = this.currentMap[y][x] === 2 ? 0 : 2;
            }
            else if (tool === 'door') {
                this.currentMap[y][x] = this.currentMap[y][x] === 3 ? 0 : 3;
            }
            else if (tool === 'portal') {
                this.currentMap[y][x] = this.currentMap[y][x] === 4 ? 0 : 4;
            }
        }

        this.renderGridEditor();
    }

    async loadPhasesForSelect(selectedId, worldId = null) {
        let query = supabase.from('phases').select('id, title, world_id');
        if (worldId) query = query.eq('world_id', worldId);

        const { data: phases } = await query;
        const select = document.getElementById('inp-phase');
        if (!select) return;
        select.innerHTML = '<option value="">Sin Fase</option>';
        phases?.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.title;
            if (p.id == selectedId) opt.selected = true;
            select.appendChild(opt);
        });
    }

    async initLevelEditor(data) {
        // 1. Load World Filter
        const { data: worlds } = await supabase.from('worlds').select('id, title').order('id');
        const worldSelect = document.getElementById('inp-world-filter');
        worldSelect.innerHTML = '<option value="">-- Filtrar por Mundo --</option>';

        worlds?.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = w.title;
            worldSelect.appendChild(opt);
        });

        // 2. Determine initial world
        let initialWorldId = null;
        if (data.phase_id) {
            // If editing, fetch the phase's world
            const { data: phase } = await supabase.from('phases').select('world_id').eq('id', data.phase_id).single();
            if (phase) initialWorldId = phase.world_id;
        }

        // 3. Set Initial State
        if (initialWorldId) {
            worldSelect.value = initialWorldId;
            await this.loadPhasesForSelect(data.phase_id, initialWorldId);
        } else {
            // New Level or No Phase: Load all or empty? Let's load nothing until world selected
            this.loadPhasesForSelect(null, -1); // Load empty
        }

        // 4. Bind Change Event
        worldSelect.addEventListener('change', async (e) => {
            await this.loadPhasesForSelect(null, e.target.value);
        });
    }

    closeModal() {
        const modal = document.getElementById('admin-modal');
        if (modal) modal.style.display = 'none';
        this.currentEditId = null;
    }

    async saveModal() {
        const type = this.currentEditType;
        const id = this.currentEditId;

        // --- 1. USER CREATION (Special flow via Auth API) ---
        if (type === 'user' && !id) {
            const email = document.getElementById('inp-email').value;
            const password = document.getElementById('inp-password').value;
            const username = document.getElementById('inp-username').value;
            const role = document.getElementById('inp-role').value;

            if (!email || !password || !username) {
                alert('Email, Contraseña y Usuario son requeridos.');
                return;
            }

            // Env Check
            const sUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL);
            const sKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);
            if (!sUrl) {
                this.showError("Missing VITE_SUPABASE_URL.");
                return;
            }

            // Temp Client for SignUp
            const tempClient = createClient(sUrl, sKey);

            try {
                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email,
                    password,
                    options: { data: { username: username } }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("No se recibió usuario.");

                const newId = authData.user.id;

                // Create Profile
                const { error: profileErr } = await supabase.from('profiles').upsert({
                    id: newId,
                    username: username,
                    role: role,
                    email: email
                });

                if (profileErr) throw profileErr;

                alert("✅ Usuario creado con éxito.\nID: " + newId);
                this.switchView('users');
                return;

            } catch (e) {
                console.error(e);
                alert("Error creando usuario: " + e.message);
                return;
            }
        }

        // --- 2. STANDARD SAVE (Update User, or Save Level/World) ---
        let table = '';
        let payload = {};

        if (type === 'user') {
            table = 'profiles';
            const newUsername = document.getElementById('inp-username').value;

            // Uniqueness Check (Update only)
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', newUsername)
                .neq('id', id)
                .single();

            if (existing) {
                alert("⛔ El nombre de usuario ya existe. Elige otro.");
                return;
            }

            let finalSvg = document.getElementById('inp-avatar').value;
            // Avatar Regen Logic
            if (window.CodeHero && window.CodeHero.UI && window.CodeHero.UI.drawAvatar && finalSvg.includes('<!--config:')) {
                try {
                    const parts = finalSvg.split('<!--config:');
                    const configStr = parts[1].split('-->')[0];
                    const config = JSON.parse(configStr);
                    const svgBase = window.CodeHero.UI.drawAvatar(config, newUsername);
                    finalSvg = `${svgBase}<!--config:${configStr}-->`;
                } catch (e) { console.warn(e); }
            }

            payload = {
                role: document.getElementById('inp-role').value,
                username: newUsername,
                avatar_svg: finalSvg
            };
        } else if (type === 'level') {
            table = 'levels';
            try {
                // Fix: Read from State, not DOM (which has tabs and hidden fields are gone)
                // Also validate numeric inputs
                const score = parseInt(document.getElementById('inp-score')?.value) || 10;

                payload = {
                    title: document.getElementById('inp-title').value,
                    type: document.getElementById('inp-type').value,
                    description: document.getElementById('inp-desc').value,
                    phase_id: parseInt(document.getElementById('inp-phase').value),
                    perfect_score: score,
                    stars_2_threshold: parseInt(document.getElementById('inp-star2')?.value) || Math.ceil(score * 1.5),
                    stars_1_threshold: parseInt(document.getElementById('inp-star1')?.value) || Math.ceil(score * 2.0),
                    map: this.currentMap, // Use state directly
                    start_pos: this.levelMeta.start, // Use state directly
                    end_pos: this.levelMeta.end, // Use state directly
                    hint: document.getElementById('inp-hint').value,
                    start_code: this.startCode || []
                };

                // Validations
                if (!payload.phase_id) throw new Error("Debes seleccionar una Fase.");
                if (payload.start_pos.x === -1) throw new Error("Falta colocar la Bandera de Inicio (🚩).");
                if (payload.end_pos.x === -1) throw new Error("Falta colocar la Meta (🏁).");

            } catch (e) {
                alert("Error preparando Nivel: " + e.message);
                return;
            }
        } else if (type === 'world') {
            table = 'worlds';
            payload = {
                title: document.getElementById('inp-title').value,
                description: document.getElementById('inp-desc').value
            };
        } else if (type === 'phase') {
            table = 'phases';
            payload = {
                title: document.getElementById('inp-title').value,
                description: document.getElementById('inp-desc').value,
                order_index: parseInt(document.getElementById('inp-order').value) || 0,
                world_id: this.currentContext?.worldId
            };
        } else if (type === 'type') {
            table = 'level_types';
            payload = {
                name: document.getElementById('inp-name').value,
                slug: document.getElementById('inp-slug').value,
                color: document.getElementById('inp-color').value,
                description: document.getElementById('inp-desc').value
            };
        }

        // DB Upsert
        let error;
        if (id) {
            const { error: err } = await supabase.from(table).update(payload).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from(table).insert(payload);
            error = err;
        }

        if (error) alert("Error: " + error.message);
        else {
            alert("Guardado!");
            if (type === 'phase' && this.currentContext?.worldId) {
                this.switchView('edit-world', this.currentContext.worldId);
            } else {
                this.switchView(type + 's');
            }
        }
    }


    // --- Auth ---

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.reload();
        } catch (err) {
            if (errorEl) errorEl.textContent = err.message;
        }
    }

    showLogin() {
        const login = document.getElementById('admin-login');
        const app = document.getElementById('admin-app');
        if (login) login.style.setProperty('display', 'flex', 'important');
        if (app) app.style.filter = 'blur(5px)';
    }

    async showDashboard(user) {
        // Init Views
        this.renderWorlds(); // Just creates the container structure

        // Ensure data is loaded properly before showing stats
        await this.loadData();

        // Hide Login
        const login = document.getElementById('admin-login');
        const app = document.getElementById('admin-app');
        if (login) login.style.setProperty('display', 'none', 'important');
        if (app) app.style.filter = 'none';

        const nameEl = document.getElementById('admin-name');
        if (nameEl) nameEl.textContent = user.email;

        this.updateStats();
    }

    updateStats() {
        const uEl = document.getElementById('stat-users');
        const lEl = document.getElementById('stat-levels');
        const wEl = document.getElementById('stat-worlds');
        if (uEl) uEl.textContent = this.users?.length || 0;
        if (lEl) lEl.textContent = this.levels?.length || 0;
        if (wEl) wEl.textContent = this.worlds?.length || 0;
    }
    async renderSettings() {
        const container = document.getElementById('view-editor-content'); // Reuse editor container or view-settings
        // Actually I should use view-settings if I created it.
        // Let's use view-settings.
        const settingsView = document.getElementById('view-settings');
        if (!settingsView) return;
        settingsView.innerHTML = `
    <div class="card" style="width:95%; max-width:800px; margin: 40px auto; padding:20px; box-sizing:border-box">
                <h2 style="margin-bottom:30px; color:var(--primary); text-align:center">⚙️ Configuración del Sistema</h2>
                
                <div class="form-group" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:20px; background:rgba(255,255,255,0.05); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
                    <div style="flex:1; min-width: 250px;">
                        <label style="font-weight:bold; font-size:1.1rem; display:block; margin-bottom:8px; color:white">Permitir Registro Público</label>
                        <small style="color:#aaa; display:block; line-height:1.4">
                            Si está <strong style="color:var(--danger)">DESACTIVADO</strong>, la opción de crear cuenta estará bloqueada en la App.
                        </small>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:15px; margin-left:0;">
                        <span id="lbl-signup-status" style="font-weight:bold; font-size:0.9rem; color:#666">...</span>
                        <label class="switch" style="position:relative; display:inline-block; width:60px; height:34px; flex-shrink:0;">
                            <input type="checkbox" id="chk-allow-signup" style="opacity:0; width:0; height:0">
                            <span class="slider round" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#334155; transition:.4s; border-radius:34px"></span>
                        </label>
                    </div>
                </div>
                
                <style>
                    .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow:0 2px 4px rgba(0,0,0,0.3); }
                    input:checked + .slider { background-color: var(--success); }
                    input:checked + .slider:before { transform: translateX(26px); }
                </style>

                <div style="margin-top:30px; text-align:center">
                    <button class="btn-primary" id="btn-save-settings" style="width:100%; padding:15px; font-size:1.1rem; box-shadow:0 4px 15px rgba(59, 130, 246, 0.3)">💾 Guardar Configuración</button>
                    
                    <button class="btn-primary" id="btn-restore-content" style="width:100%; padding:15px; margin-top:15px; font-size:1.1rem; background: #ea580c; border-color:#c2410c; box-shadow:0 4px 15px rgba(234, 88, 12, 0.3)">⚠️ Restaurar Contenido (Fábrica)</button>

                    <div style="margin-top:20px; border-top:1px solid #444; padding-top:20px">
                         <button class="btn-secondary" id="btn-export-sql" style="width:100%; padding:15px; font-size:1.1rem">📤 Exportar SQL de Niveles Actuales</button>
                    </div>
                    
                    <p id="settings-msg" style="margin-top:15px; min-height:20px; font-weight:bold"></p>
                </div>
            </div >
    `;

        // Load Current State
        const { data: config } = await supabase.from('app_settings').select('allow_signup').eq('id', 'config').single();
        const chk = document.getElementById('chk-allow-signup');
        const lbl = document.getElementById('lbl-signup-status');

        const updateLabel = (checked) => {
            if (checked) {
                lbl.textContent = "ACTIVADO";
                lbl.style.color = "var(--success)";
            } else {
                lbl.textContent = "DESACTIVADO";
                lbl.style.color = "#888"; // Gray not red, to look disabled
            }
        };

        if (config) {
            chk.checked = config.allow_signup;
            updateLabel(config.allow_signup);
        }

        // Live Change
        chk.addEventListener('change', (e) => updateLabel(e.target.checked));

        // Bind Save
        document.getElementById('btn-save-settings').onclick = async () => {
            const checked = document.getElementById('chk-allow-signup').checked;
            const msg = document.getElementById('settings-msg');
            msg.textContent = "Guardando...";

            const { error } = await supabase.from('app_settings').upsert({ id: 'config', allow_signup: checked });

            if (error) {
                msg.style.color = 'var(--danger)';
                msg.textContent = "Error al guardar: " + error.message;
            } else {
                msg.style.color = 'var(--success)';
                msg.textContent = "¡Configuración guardada!";
                updateLabel(checked);
                setTimeout(() => msg.textContent = '', 3000);
            }
        };

        // Bind Restore
        document.getElementById('btn-restore-content').onclick = async () => {
            if (!confirm("⚠️ ¿Estás seguro de que quieres RESTAURAR todo el contenido?\n\nEsto sobrescribirá los niveles, mundos y fases con los valores originales de fábrica. (No borra usuarios ni progreso).")) {
                return;
            }

            const msg = document.getElementById('settings-msg');
            msg.textContent = "Restaurando... (Esto puede tardar unos segundos)";
            msg.style.color = 'var(--gold)';

            const { error } = await supabase.rpc('reset_level_data');

            if (error) {
                console.error("Restore Error:", error);
                msg.style.color = 'var(--danger)';
                msg.textContent = "Error al restaurar: " + error.message;
            } else {
                msg.textContent = "¡Contenido restaurado exitosamente!";
                // Refresh stats
                this.updateStats();
            }
        };

        // Bind Export SQL
        const btnExport = document.getElementById('btn-export-sql');
        if (btnExport) {
            btnExport.onclick = async () => {
                console.log("AdminApp: Export SQL Clicked");
                const msg = document.getElementById('settings-msg');
                if (msg) {
                    msg.innerHTML = "⏳ Generando SQL... <span style='font-weight:normal'>(Consultando DB)</span>";
                    msg.style.color = '#fff';
                }

                try {
                    // Fetch All Fresh Data
                    const { data: w, error: ew } = await supabase.from('worlds').select('*').order('id');
                    if (ew) throw ew;
                    const { data: p, error: ep } = await supabase.from('phases').select('*').order('id');
                    if (ep) throw ep;
                    const { data: t, error: et } = await supabase.from('level_types').select('*').order('id');
                    if (et) throw et;
                    const { data: l, error: el } = await supabase.from('levels').select('*').order('id');
                    if (el) throw el;

                    let sql = `    -- ============ [START] SEED DATA (COPY FROM ADMIN) ============\n`;
                    sql += `    -- NOTE: Select everything between [START] and [END] and replace with the code generated in Admin Panel > Settings\n\n`;

                    // TYPES
                    sql += `    -- 1. RESTORE LEVEL TYPES\n`;
                    sql += `    INSERT INTO public.level_types (id, name, slug, color, description) VALUES\n`;
                    sql += t.map(item => `    (${item.id}, '${item.name}', '${item.slug}', '${item.color}', '${(item.description || '').replace(/'/g, "''")}')`).join(',\n');
                    sql += `;\n    -- Sync Types Seq\n    ALTER SEQUENCE public.level_types_id_seq RESTART WITH ${t.length + 1};\n\n`;

                    // WORLDS
                    sql += `    -- 2. RESTORE WORLDS\n`;
                    sql += `    INSERT INTO public.worlds (id, title, description, style, level_range) VALUES\n`;
                    sql += w.map(item => {
                        const arr = item.level_range ? `'{${item.level_range[0]},${item.level_range[1]}}'` : 'NULL';
                        return `    (${item.id}, '${item.title.replace(/'/g, "''")}', '${(item.description || '').replace(/'/g, "''")}', '${item.style}', ${arr})`;
                    }).join(',\n');
                    sql += `\n    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;\n`;
                    sql += `    ALTER SEQUENCE public.worlds_id_seq RESTART WITH ${w.length + 1};\n\n`;

                    // PHASES
                    sql += `    -- 3. RESTORE PHASES\n`;
                    sql += `    INSERT INTO public.phases (id, world_id, title, description, order_index) VALUES\n`;
                    sql += p.map(item => `    (${item.id}, ${item.world_id}, '${item.title.replace(/'/g, "''")}', '${(item.description || '').replace(/'/g, "''")}', ${item.order_index})`).join(',\n');
                    sql += `\n    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;\n`;
                    sql += `    ALTER SEQUENCE public.phases_id_seq RESTART WITH ${p.length + 1};\n\n`;

                    // LEVELS
                    sql += `    -- 4. RESTORE LEVELS (Total: ${l.length})\n`;
                    l.forEach(lvl => {
                        const mapStr = JSON.stringify(lvl.map);
                        const startStr = JSON.stringify(lvl.start_pos);
                        const endStr = JSON.stringify(lvl.end_pos);
                        const codeStr = lvl.start_code ? JSON.stringify(lvl.start_code) : 'NULL';
                        const desc = (lvl.description || '').replace(/'/g, "''");
                        const hint = (lvl.hint || '').replace(/'/g, "''");

                        sql += `    INSERT INTO public.levels (id, phase_id, title, description, type, map, start_pos, end_pos, perfect_score, stars_2_threshold, stars_1_threshold, start_code, hint, difficulty) VALUES \n`;
                        sql += `    (${lvl.id}, ${lvl.phase_id}, '${lvl.title.replace(/'/g, "''")}', '${desc}', '${lvl.type}', '${mapStr}'::jsonb, '${startStr}'::jsonb, '${endStr}'::jsonb, ${lvl.perfect_score}, ${lvl.stars_2_threshold}, ${lvl.stars_1_threshold}, ${codeStr === 'NULL' ? 'NULL' : `'${codeStr}'::jsonb`}, '${hint}', ${lvl.difficulty || 1}) \n`;
                        sql += `    ON CONFLICT (id) DO UPDATE SET map = EXCLUDED.map, start_pos = EXCLUDED.start_pos, end_pos = EXCLUDED.end_pos, perfect_score = EXCLUDED.perfect_score;\n`;
                    });
                    sql += `    ALTER SEQUENCE public.levels_id_seq RESTART WITH ${l.length + 1};\n`;

                    sql += `\n    -- ============ [ END ] SEED DATA (COPY FROM ADMIN) ============\n`;

                    // SHOW MODAL
                    const modal = document.getElementById('modal-sql');
                    const textarea = document.getElementById('txt-sql-export');
                    const btnCopy = document.getElementById('btn-copy-sql');

                    if (modal && textarea) {
                        textarea.value = sql;
                        modal.style.display = 'flex'; // FORCE FLEX
                        textarea.select();

                        btnCopy.onclick = () => {
                            textarea.select();
                            document.execCommand('copy');
                            if (navigator.clipboard) navigator.clipboard.writeText(sql);
                            btnCopy.textContent = "✅ ¡Copiado!";
                            setTimeout(() => btnCopy.innerHTML = "📋 Copiar al Portapapeles", 2000);
                        };

                        if (msg) {
                            msg.textContent = "✅ Script generado. Copialo de la ventana modal.";
                            msg.style.color = "var(--success)";
                        }
                    } else {
                        console.log(sql);
                        alert("Error: No se encontró el MODAL en el HTML. Revisa admin.html");
                    }
                } catch (e) {
                    console.error("Export Failed", e);
                    if (msg) {
                        msg.textContent = "Error Generando SQL: " + e.message;
                        msg.style.color = "var(--danger)";
                    }
                    alert("Error Generando SQL: " + e.message);
                }
            };
        } else {
            console.error("Button btn-export-sql not found in DOM");
        }
    }
    // Helper for Styled Errors
    showError(msg) {
        let errorBox = document.getElementById('editor-error-msg');
        if (!errorBox) {
            errorBox = document.createElement('div');
            errorBox.id = 'editor-error-msg';
            // Inline Styles for minimal dependency
            Object.assign(errorBox.style, {
                color: '#ff6b6b',
                background: 'rgba(255, 0, 0, 0.1)',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                display: 'none',
                fontSize: '0.9rem'
            });
            // Insert before buttons
            const actions = document.querySelector('.editor-actions');
            if (actions) actions.parentNode.insertBefore(errorBox, actions);
        }

        errorBox.innerHTML = `<span>${msg}</span>`;
        errorBox.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // console.log("DOM Ready, Launching AdminApp");
    try {
        new AdminApp();
    } catch (e) {
        alert("CRITICAL BOOT ERROR: " + e.message);
    }
});
