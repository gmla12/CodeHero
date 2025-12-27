CodeHero.Managers.DataManager = {};

CodeHero.Managers.DataManager.initData = function () {
    if (!sessionStorage.getItem('final_v1')) {
        localStorage.clear();
        sessionStorage.setItem('final_v1', 'true');
    }
    if (localStorage.getItem('CodeHeroDB')) {
        try {
            CodeHero.State.db = JSON.parse(localStorage.getItem('CodeHeroDB'));
        } catch (e) { }
    }
    CodeHero.Managers.DataManager.initBots();
    CodeHero.Managers.DataManager.initBots();
};

CodeHero.Managers.DataManager.loadLevels = async function () {
    const supabase = CodeHero.Supabase;
    if (!supabase) return;

    // 0. Fetch Level Types (New)
    const { data: levelTypes } = await supabase.from('level_types').select('*');
    if (levelTypes && levelTypes.length > 0) {
        CodeHero.Data.LEVEL_TYPES = levelTypes;
    } else {
        CodeHero.Data.LEVEL_TYPES = []; // Fallback
    }

    // 1. Fetch Worlds
    const { data: worlds } = await supabase.from('worlds').select('*').order('id');
    if (worlds && worlds.length > 0) {
        CodeHero.Data.WORLDS = worlds;
    } else {
        // Fallback Default
        CodeHero.Data.WORLDS = [{ id: 1, title: 'Mundo Inicial' }];
    }

    // 2. Fetch Phases
    const { data: phases } = await supabase.from('phases').select('*').order('id');
    if (phases && phases.length > 0) {
        CodeHero.Data.PHASES = phases;
    } else {
        // Fallback Default
        CodeHero.Data.PHASES = [{ id: 1, world_id: 1, title: 'Fase 1', description: 'Fundamentos' }];
    }

    // 3. Fetch Levels
    const { data, error } = await supabase.from('levels').select('*').order('id');
    if (data && data.length > 0) {
        console.log(`Loaded ${data.length} levels from Supabase.`);
        CodeHero.Data.LEVELS = data.map(l => ({
            ...l,
            phase_id: l.phase_id || 1, // FORCE Default Phase if missing
            start: l.start_pos,
            end: l.end_pos,
            perfect: l.perfect_score
        }));
    } else {
        // use local levels
        console.warn('Using local levels.');
        CodeHero.Data.LEVELS = window.LEVELS_DATA || [];
    }
};

CodeHero.Managers.DataManager.uploadLevels = async function () {
    const supabase = CodeHero.Supabase;
    if (!supabase) return;

    const levelsToUpload = CodeHero.Data.LEVELS.map(l => ({
        id: l.id,
        world_id: 1, // Default World
        title: l.title,
        type: l.type,
        description: l.description,
        map: l.map,
        start_pos: l.start,
        end_pos: l.end,
        perfect_score: l.perfect
        // created_at defaults
    }));

    const { error } = await supabase.from('levels').upsert(levelsToUpload);
    if (error) console.error('Upload failed:', error);
    else console.log('Levels uploaded successfully!');
};

CodeHero.Managers.DataManager.initBots = function () {
    const hasBots = CodeHero.State.db.users.some(u => u.isBot);
    if (!hasBots) {
        CodeHero.Config.BOTS_DATA.forEach(bot => {
            CodeHero.State.db.users.push({
                name: bot.name,
                avatar: bot.avatar,
                score: bot.baseScore,
                maxLevel: 5,
                stars: {},
                isBot: true
            });
        });
        CodeHero.Managers.DataManager.saveData();
    }
};

CodeHero.Managers.DataManager.saveData = async function () {
    // 1. Local Backup
    localStorage.setItem('CodeHeroDB', JSON.stringify(CodeHero.State.db));

    // 2. Cloud Sync (Supabase)
    const user = CodeHero.State.currentUser;
    if (!user || !user.id || !CodeHero.Supabase) return;

    // Prepare Payload
    // Convert stars object { level_id: stars } to array for upsert
    // We only care about syncing the current state of stars/score for levels.
    // Ideally we upsert rows for each level completed.

    // We iterate known levels or user stars
    const progressUpdates = Object.keys(user.stars).map(lvlId => ({
        user_id: user.id,
        level_id: parseInt(lvlId),
        stars: user.stars[lvlId],
        score: 100 * user.stars[lvlId], // Approximation if score not tracked per level
        completed_at: new Date()
    }));

    if (progressUpdates.length > 0) {
        const { error } = await CodeHero.Supabase.from('progress').upsert(progressUpdates, { onConflict: 'user_id, level_id' });
        if (error) console.error('Cloud Save Error:', error);
        else console.log('Progress Saved to Cloud');
    }
};

CodeHero.Managers.DataManager.resetCloudProgress = async function (uid) {
    if (!CodeHero.Supabase) return;
    const { error } = await CodeHero.Supabase.from('progress').delete().eq('user_id', uid);
    if (error) {
        console.error("Failed to reset cloud progress:", error);
        alert("Error borrando progreso en la nube: " + error.message);
    } else {
        console.log("Cloud progress wiped for", uid);
    }
};

CodeHero.Managers.DataManager.loginUser = function (idx) {
    CodeHero.State.currentUserIdx = idx;
    CodeHero.State.currentUser = CodeHero.State.db.users[idx];
    return CodeHero.State.currentUser;
};
