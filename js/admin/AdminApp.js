class AdminApp {
    constructor() {
        this.levels = [];
        this.worlds = [];
        this.phases = [];
        this.users = [];
        this.currentContext = null;
        this.currentTools = { type: 'wall' }; // Default Tool

        if (!window.supabase) {
            alert("Error: Supabase no está cargado.");
            return;
        }
        this.init();
    }

    async init() {
        try {
            // Check Session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) console.error(sessionError);

            if (session) {
                // Logged In
                const loginOverlay = document.getElementById('admin-login');
                if (loginOverlay) {
                    loginOverlay.classList.remove('active');
                    loginOverlay.style.setProperty('display', 'none', 'important');
                }

                // SHOW APP CONTAINER
                const appContainer = document.getElementById('admin-app');
                if (appContainer) {
                    appContainer.style.display = 'flex';
                }

                await this.loadData();
                this.switchView('dashboard'); // Default View
                this.updateStats();

                // Get User Name
                const { data: profile, error: profileError } = await supabase.from('profiles').select('username, role').eq('id', session.user.id).single();

                if (profileError) {
                    alert("Error recuperando perfil: " + profileError.message);
                }

                if (profile) {
                    if (profile.role !== 'admin') {
                        alert("Acceso Denegado: No eres administrador.");
                        await supabase.auth.signOut();
                        window.location.reload();
                        return;
                    }
                    document.getElementById('admin-name').innerText = profile.username || "Admin";
                }
            } else {
                // Not Logged In - Show Login Overlay
                const loginOverlay = document.getElementById('admin-login');
                if (loginOverlay) {
                    loginOverlay.classList.add('active');
                    loginOverlay.style.display = 'flex';
                }
                this.bindLogin();
            }

            this.bindEvents(); // Core Navigation
        } catch (err) {
            console.error(err);
            alert("Error Iniciando Admin: " + err.message);
        }
    }

    bindLogin() {
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('email');
        const pass = document.getElementById('password');
        const err = document.getElementById('login-error');

        const doLogin = async () => {
            btn.innerText = "Entrando..."; btn.disabled = true; err.innerText = "";
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.value,
                password: pass.value
            });

            if (error) {
                err.innerText = error.message;
                btn.innerText = "Entrar"; btn.disabled = false;
            } else {
                window.location.reload();
            }
        };

        btn.onclick = doLogin;

        // Enter key support
        pass.addEventListener('keypress', (e) => { if (e.key === 'Enter') doLogin(); });
    }

    async loadData() {
        const { data: l } = await supabase.from('levels').select('*').order('id');
        const { data: w } = await supabase.from('worlds').select('*').order('id');
        const { data: p } = await supabase.from('phases').select('*').order('id');

        this.levels = l || [];
        this.worlds = w || [];
        this.phases = p || [];
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });

        // Auth State Listener
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                document.getElementById('admin-login').style.display = 'flex';
                document.getElementById('app-container').style.display = 'none';
            }
        });

        // Add Floating Buttons
        document.getElementById('btn-add-level')?.addEventListener('click', () => this.switchView('edit-level'));
        document.getElementById('btn-add-world')?.addEventListener('click', () => this.switchView('edit-world'));
        document.getElementById('btn-add-type')?.addEventListener('click', () => this.switchView('edit-type'));

        // --- MOBILE SIDEBAR LOGIC ---
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay'); // If we had one

        document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
            if (sidebar) sidebar.classList.add('open');
        });

        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
        });

        // Auto Close on Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (sidebar) sidebar.classList.remove('open');
            });
        });
    }

    async updateStats() {
        console.log("Dashboard: Updating Extended Stats...");

        // 1. Users & Bots (Fetch all minimal to separate, or use count queries if RLS allows)
        // Since we are admin, we can fetch all.
        const { data: usersData } = await supabase.from('profiles').select('is_bot');
        const totalProfiles = usersData?.length || 0;
        const totalBots = usersData?.filter(u => u.is_bot).length || 0;
        const realUsers = totalProfiles - totalBots;

        // 2. Content Counts
        const { count: worlds } = await supabase.from('worlds').select('*', { count: 'exact', head: true });
        const { count: phases } = await supabase.from('phases').select('*', { count: 'exact', head: true });
        const { count: levels } = await supabase.from('levels').select('*', { count: 'exact', head: true });
        const { count: types } = await supabase.from('level_types').select('*', { count: 'exact', head: true });

        // 3. Progress (Engagement)
        const { count: progress } = await supabase.from('progress').select('*', { count: 'exact', head: true });

        // 4. Update UI
        // Users
        document.getElementById('stat-users-real').innerText = realUsers;
        document.getElementById('stat-bots').innerText = totalBots;

        // Content
        document.getElementById('stat-worlds').innerText = worlds || 0;
        document.getElementById('stat-phases').innerText = phases || 0;
        document.getElementById('stat-levels').innerText = levels || 0;
        document.getElementById('stat-types').innerText = types || 0;

        // Engagement
        document.getElementById('stat-progress').innerText = progress || 0;
    }

    async switchView(viewName, editId = null, context = null) {
        this.currentContext = context;
        // Hide ALL views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

        // Handle Editor Views
        if (viewName.startsWith('edit-')) {
            const type = viewName.replace('edit-', '');
            document.getElementById('view-editor').classList.add('active');
            this.updateTitle(`Editando ${type.charAt(0).toUpperCase() + type.slice(1)}`); // Helper

            // This method is in AdminEditor.js
            if (this.renderEditor) {
                this.renderEditor(type, editId);
            } else {
                console.error("Module AdminEditor not loaded!");
            }
        }
        else if (viewName === 'settings') {
            document.getElementById('view-settings').classList.add('active');
            this.updateTitle("Configuración del Sistema");
            if (this.renderSettings) {
                this.renderSettings();
            }
        }
        else {
            // Lists
            const container = document.getElementById(`view-${viewName}`);
            if (container) container.classList.add('active');

            // Titles
            const titles = {
                dashboard: "Resumen General",
                levels: "Gestión de Misiones",
                worlds: "Mundos y Fases",
                users: "Usuarios Registrados",
                types: "Tipos de Nivel",
                bots: "Configuración de Bots"
            };
            this.updateTitle(titles[viewName] || "Admin");

            // Dispatch to Module Methods
            if (viewName === 'levels' && this.renderLevels) this.renderLevels();
            if (viewName === 'worlds' && this.renderWorlds) this.renderWorlds();
            if (viewName === 'users' && this.renderUsers) this.renderUsers();
            if (viewName === 'types' && this.renderTypes) this.renderTypes();
            if (viewName === 'bots' && this.renderBots) this.renderBots();
        }
    }

    updateTitle(text) {
        const el = document.getElementById('page-title');
        if (el) el.innerText = text;
    }

    // Helper used by multiple modules
    loadWorldsForSelect(selectedId) {
        const sel = document.getElementById('inp-world');
        if (!sel) return;
        sel.innerHTML = this.worlds.map(w => `<option value="${w.id}" ${w.id == selectedId ? 'selected' : ''}>${w.title}</option>`).join('');
    }

    showError(msg) {
        alert(msg); // Placeholder fallback
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    try {
        new AdminApp();
    } catch (e) {
        alert("CRITICAL BOOT ERROR: " + e.message);
    }
});
