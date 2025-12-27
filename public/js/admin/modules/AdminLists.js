// Module: AdminLists
// Handles rendering of data tables (Levels, Worlds, Users)

if (typeof AdminApp === 'undefined') {
    console.error("Critical: AdminApp class must be loaded before modules.");
} else {

    // --- HELPER: BIND SEARCH ---
    AdminApp.prototype.bindSearchListener = function (inputId, renderFn) {
        const input = document.getElementById(inputId);
        if (input && !input.dataset.bound) {
            input.addEventListener('input', () => renderFn.call(this));
            input.dataset.bound = "true";
        }
    };

    AdminApp.prototype.renderLevels = function () {
        const list = document.getElementById('list-levels');
        if (!list) return;
        list.innerHTML = '';

        this.bindSearchListener('filter-levels-search', this.renderLevels);
        // Also bind world select if exists
        const wSelect = document.getElementById('filter-levels-world');
        if (wSelect && !wSelect.dataset.bound) {
            wSelect.addEventListener('change', () => this.renderLevels.call(this));
            wSelect.dataset.bound = "true";
        }

        const search = document.getElementById('filter-levels-search')?.value.toLowerCase() || '';
        const wId = document.getElementById('filter-levels-world')?.value;

        const filtered = this.levels.filter(l => {
            const matchesSearch = l.title.toLowerCase().includes(search) || l.id.toString().includes(search);
            let matchesWorld = true;
            if (wId) {
                const phase = this.phases.find(p => p.id === l.phase_id);
                matchesWorld = phase && phase.world_id == wId;
            }
            return matchesSearch && matchesWorld;
        });

        // Update Count
        const countEl = document.getElementById('count-levels');
        if (countEl) countEl.innerText = `${filtered.length} de ${this.levels.length} niveles`;

        // Debug/Empty State
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">
                No se encontraron niveles.<br>
                <small>Loaded: ${this.levels.length} | Visible: ${filtered.length}</small>
            </td></tr>`;
        }

        filtered.forEach(l => {
            const tr = document.createElement('tr');
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
    };

    AdminApp.prototype.renderWorlds = function () {
        const list = document.getElementById('list-worlds');
        if (!list) return;
        list.innerHTML = '';

        this.bindSearchListener('filter-worlds-search', this.renderWorlds);

        const search = document.getElementById('filter-worlds-search')?.value.toLowerCase() || '';
        const data = this.worlds || [];
        const filtered = data.filter(w => (w.title || '').toLowerCase().includes(search));

        // Update Count
        const countEl = document.getElementById('count-worlds');
        if (countEl) countEl.innerText = `${filtered.length} de ${data.length} mundos`;

        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">
                No se encontraron mundos.<br>
                <small>Loaded: ${data.length} | Visible: ${filtered.length}</small>
            </td></tr>`;
        }

        filtered.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><small>${w.id}</small></td><td>${w.title}</td><td>${w.description}</td><td>
                 <button class="btn-sm btn-edit" data-type="world" data-id="${w.id}" title="Editar">✏️</button>
                 <button class="btn-sm btn-del" data-type="world" data-id="${w.id}" title="Eliminar">🗑️</button>
            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    };

    AdminApp.prototype.renderUsers = async function (forceReload = true) {
        // Optimization: Only fetch if needed or forced (e.g. first load)
        // But for filter re-renders, use cache
        if (!this.users || this.users.length === 0 || forceReload) {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) {
                console.error("AdminLists Error:", error);
                this.showError("Error cargando usuarios: " + error.message);
            }
            this.users = data || [];
        }

        const list = document.getElementById('list-users');
        if (!list) return;
        list.innerHTML = '';

        // Bind Search Listener (Important!)
        const searchInput = document.getElementById('filter-users-search');
        if (searchInput && !searchInput.dataset.bound) {
            // Fix Autofill Issue: Clear it on first bind if it looks suspicious or user wants clean slate
            // But we respect user input if they are typing.
            // Actually, simply binding it allows them to clear it and update.
            searchInput.addEventListener('input', () => this.renderUsers(false)); // False = don't refetch DB, just filter
            searchInput.dataset.bound = "true";
        }

        // Add "New User" Button Logic
        const toolbar = document.querySelector('#view-users .table-container').previousElementSibling;
        if (toolbar && !document.getElementById('btn-add-user')) {
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.id = 'btn-add-user';
            btn.textContent = '+ Nuevo Usuario';
            btn.style.marginBottom = '10px';
            btn.addEventListener('click', () => this.switchView('edit-user'));
            toolbar.appendChild(btn);
        }

        // --- FILTER LOGIC ---
        let filtered = [];
        let search = '';

        if (searchInput) {
            search = (searchInput.value || '').trim().toLowerCase();
        }

        // Log autofill detection & Auto-Clear
        if (search.includes('@') && forceReload) {
            console.warn("AdminLists: Verified autofill prevents empty state. Clearing.");
            if (searchInput) searchInput.value = '';
            search = '';
        }

        try {
            if (!search) {
                filtered = this.users;
            } else {
                filtered = this.users.filter(u => {
                    const displayName = (u.username || u.full_name || u.email || '').toLowerCase();
                    const role = (u.role || '').toLowerCase();
                    const uid = (u.id || '').toLowerCase();
                    return displayName.includes(search) || uid.includes(search) || role.includes(search);
                });
            }
        } catch (e) {
            console.error("Filter Crash:", e);
            filtered = this.users;
        }

        // Update Count
        const countEl = document.getElementById('count-users');
        if (countEl) countEl.innerText = `${filtered.length} de ${this.users.length} usuarios`;

        // --- RENDER ---
        if (filtered.length === 0) {
            list.innerHTML = `
                <tr><td colspan="4" style="text-align:center; color:#888;">
                    No se encontraron usuarios.<br>
                    <small>Loaded: ${this.users.length} | Visible: ${filtered.length} | Search: "${search}"</small>
                </td></tr>`;
        }

        filtered.forEach(u => {
            const tr = document.createElement('tr');
            const displayName = u.username || u.full_name || u.email || 'Sin Nombre';

            let roleBadge = u.role || 'user';
            if (roleBadge.toLowerCase() === 'admin') roleBadge = '<span style="color:var(--gold); font-weight:bold">Admin 🛡️</span>';
            if (u.is_bot) roleBadge = '<span style="color:#06b6d4; font-weight:bold; background:#06b6d422; padding:2px 6px; border-radius:4px;">🤖 Bot</span>';

            tr.innerHTML = `<td><small>${u.id.substring(0, 8)}</small></td><td>${displayName}</td><td>${roleBadge}</td><td>
                <button class="btn-sm btn-edit" data-type="user" data-id="${u.id}" title="Editar">✏️</button>
                <button class="btn-sm btn-del" data-type="user" data-id="${u.id}" title="Eliminar">🗑️</button>
            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    };

    AdminApp.prototype.renderTypes = async function () {
        const { data, error } = await supabase.from('level_types').select('*').order('id');
        if (error) {
            this.showError("Error cargando tipos: " + error.message);
            return;
        }

        const list = document.getElementById('list-types');
        if (!list) return;
        list.innerHTML = '';

        this.bindSearchListener('filter-types-search', this.renderTypes);

        this.bindSearchListener('filter-types-search', this.renderTypes);

        // Filter Logic
        const search = document.getElementById('filter-types-search')?.value.toLowerCase() || '';
        const filtered = (data || []).filter(t => (t.name || '').toLowerCase().includes(search) || (t.slug || '').includes(search));

        // Update Count
        const countEl = document.getElementById('count-types');
        if (countEl) countEl.innerText = `${filtered.length} de ${data.length} tipos`;

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            const icon = t.icon || '';
            let color = t.color || '#ffffff';
            if (color.length > 20 || color.includes(' ')) color = '#999999';

            const colorBlock = `<span style="display:inline-block;width:12px;height:12px;background:${color};border-radius:2px;margin-right:5px;border:1px solid #777;vertical-align:middle;"></span>`;

            tr.innerHTML = `<td><small>${t.id}</small></td>
                            <td>${icon} ${t.name}</td>
                            <td>${colorBlock} <small class="text-muted">${color}</small></td>
                            <td>${t.slug || '-'}</td>
                            <td>
                                <button class="btn-sm btn-edit" data-type="type" data-id="${t.id}" title="Editar">✏️</button>
                                <button class="btn-sm btn-del" data-type="type" data-id="${t.id}" title="Eliminar">🗑️</button>
                            </td>`;
            list.appendChild(tr);
        });
        this.bindListActions(list);
    };

    AdminApp.prototype.bindListActions = function (container) {
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchView('edit-' + btn.dataset.type, btn.dataset.id);
            };
        });

        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                setTimeout(() => this.deleteItem(btn.dataset.id, btn.dataset.type), 50);
            };
        });
    };

    AdminApp.prototype.deleteItem = async function (id, type, name = "Item") {
        if (!confirm(`¿Eliminar ${name}? Esta acción es irreversible.`)) return;

        if (!await this.checkDependencies(type, id)) return;

        let table = type + 's';
        if (type === 'user') table = 'profiles';

        let error = null;

        if (type === 'user') {
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
            if (this.currentContext && this.currentContext.worldId && type === 'phase') {
                this.switchView('edit-world', this.currentContext.worldId);
            } else {
                this.switchView(type === 'phase' ? 'worlds' : type + 's');
            }
        }
    };

    AdminApp.prototype.checkDependencies = async function (type, id) {
        if (type === 'world') {
            const { count } = await supabase.from('phases').select('*', { count: 'exact', head: true }).eq('world_id', id);
            if (count > 0) {
                alert(`⚠️ NO SE PUEDE ELIMINAR.\n\nEste Mundo tiene ${count} Fases asociadas.`);
                return false;
            }
        }
        else if (type === 'phase') {
            const { count } = await supabase.from('levels').select('*', { count: 'exact', head: true }).eq('phase_id', id);
            if (count > 0) {
                alert(`⚠️ NO SE PUEDE ELIMINAR.\n\nEsta Fase tiene ${count} Niveles asociados.`);
                return false;
            }
        }
        return true;
    }

}
