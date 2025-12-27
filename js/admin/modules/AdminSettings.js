// Module: AdminSettings
// Handles System Configuration, Restores, and SQL Export

if (typeof AdminApp === 'undefined') {
    console.error("Critical: AdminApp class must be loaded before modules.");
} else {

    AdminApp.prototype.renderSettings = async function () {
        const container = document.getElementById('view-settings');
        if (!container) return;

        // 1. Inject Structure (Simpler List View)
        container.innerHTML = `
            <div class="settings-view" style="max-width: 600px; margin: 20px auto; padding: 0 15px;">
                
                <!-- System Config Section -->
                <div class="setting-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="margin-top:0; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 15px;">🔒 Acceso y Seguridad</h3>
                    
                    <div class="setting-item" style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                        <div class="setting-info" style="flex: 1;">
                            <strong style="display: block; font-size: 1rem; color: white;">Registro Público</strong>
                            <small style="color: #aaa; display: block; margin-top: 4px;">Permitir que nuevos usuarios se registren desde la App.</small>
                        </div>
                        <div class="setting-control">
                            <span id="lbl-signup-status" style="display:block; font-size:0.7rem; text-align:right; margin-bottom:5px; color:#666">...</span>
                            <label class="switch" style="position:relative; display:inline-block; width:50px; height:28px;">
                                <input type="checkbox" id="chk-allow-signup" style="opacity:0; width:0; height:0">
                                <span class="slider round" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#334155; transition:.4s; border-radius:34px"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Actions Section -->
                <div class="setting-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
                    <h3 style="margin-top:0; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 15px;">💾 Gestión de Datos</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <button class="btn-primary" id="btn-save-settings" style="width: 100%; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 10px;">
                            <span>💾</span> Guardar Cambios
                        </button>
                        
                        <button class="btn-secondary" id="btn-export-sql" style="width: 100%; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 10px;">
                            <span>📤</span> Exportar SQL (Backup)
                        </button>

                        <button id="btn-restore-content" style="width: 100%; padding: 12px; background: rgba(234, 88, 12, 0.1); color: #ea580c; border: 1px solid #ea580c; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 10px;">
                            ⚠️ Restaurar de Fábrica
                        </button>
                    </div>

                    <p id="settings-msg" style="margin-top:15px; text-align: center; min-height:20px; font-weight:bold"></p>
                </div>
                
                <style>
                    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                    input:checked + .slider { background-color: var(--success); }
                    input:checked + .slider:before { transform: translateX(22px); }
                </style>
            </div>
        `;

        // 2. Logic
        // Load Current State
        const { data: config } = await supabase.from('app_settings').select('allow_signup').eq('id', 'config').single();
        const chk = document.getElementById('chk-allow-signup');
        const lbl = document.getElementById('lbl-signup-status');

        const updateLabel = (checked) => {
            if (!lbl) return;
            if (checked) {
                lbl.textContent = "ACTIVADO";
                lbl.style.color = "var(--success)";
            } else {
                lbl.textContent = "DESACTIVADO";
                lbl.style.color = "#888";
            }
        };

        if (config) {
            if (chk) chk.checked = config.allow_signup;
            updateLabel(config.allow_signup);
        }

        if (chk) chk.addEventListener('change', (e) => updateLabel(e.target.checked));

        // Bind Save
        const btnSave = document.getElementById('btn-save-settings');
        if (btnSave) {
            btnSave.onclick = async () => {
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
        }

        // Bind Restore
        const btnRestore = document.getElementById('btn-restore-content');
        if (btnRestore) {
            btnRestore.onclick = async () => {
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
        }

        // Bind Export SQL
        const btnExport = document.getElementById('btn-export-sql');
        if (btnExport) {
            btnExport.onclick = this.generateSQL.bind(this);
        }
    };

    AdminApp.prototype.generateSQL = async function () {
        const msg = document.getElementById('settings-msg');
        if (msg) {
            msg.innerHTML = "⏳ Generando SQL... <span style='font-weight:normal'>(Consultando DB)</span>";
            msg.style.color = '#fff';
        }

        try {
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
                modal.style.display = 'flex';
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
                alert("Error: No se encontró el MODAL en el HTML.");
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

    AdminApp.prototype.resetUserProgress = async function (userId) {
        if (!supabase) { alert("Error crítico: Supabase no inicializado"); return; }
        const { error } = await supabase.from('progress').delete().eq('user_id', userId);
        if (error) {
            console.error("Error resetting progress:", error);
            alert("Error al resetear progreso: " + error.message);
        } else {
            alert("✅ Progreso eliminado correctamente.\nEl usuario volverá al Nivel 1 en su próxima sesión.");
        }
    };

}
