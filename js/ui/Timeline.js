CodeHero.UI.Timeline = {};

CodeHero.UI.Timeline.addCmd = function (cmd) {
    if (CodeHero.State.isLooping) {
        CodeHero.State.loopBuffer.push(cmd);
        CodeHero.UI.Timeline.updateLoopUI();
    } else {
        CodeHero.State.gameCommands.push(cmd);
        CodeHero.UI.Timeline.renderTimeline();
    }
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.Timeline.startLoop = function () {
    if (CodeHero.State.isLooping) return;
    CodeHero.State.isLooping = true;
    CodeHero.State.loopBuffer = [];
    CodeHero.UI.Timeline.updateLoopUI();
    CodeHero.UI.Timeline.toggleLoopButtons(true);
};

CodeHero.UI.Timeline.tempLoopCount = 4;

CodeHero.UI.Timeline.closeLoop = function () {
    if (!CodeHero.State.isLooping) return;

    // Show Modal instead of prompt
    const modal = document.getElementById('loop-config-modal');
    const display = document.getElementById('loop-count-display');
    if (modal && display) {
        CodeHero.UI.Timeline.tempLoopCount = 4; // Reset default
        display.innerText = "4";
        modal.style.display = 'flex';
    }
};

// Modal Helpers
window.adjustLoopCount = function (delta) {
    let count = CodeHero.UI.Timeline.tempLoopCount + delta;
    if (count < 1) count = 1;
    if (count > 20) count = 20; // Max limit
    CodeHero.UI.Timeline.tempLoopCount = count;
    document.getElementById('loop-count-display').innerText = count;
};

window.confirmLoopConfig = function () {
    const count = CodeHero.UI.Timeline.tempLoopCount;
    if (CodeHero.State.loopBuffer.length > 0) {
        CodeHero.State.gameCommands.push({ type: 'loop', count: count, cmds: [...CodeHero.State.loopBuffer] });
        CodeHero.UI.Timeline.renderTimeline(); // Immediate render
    }
    window.cancelLoopConfig(); // Close modal and cleanup
};

window.cancelLoopConfig = function () {
    document.getElementById('loop-config-modal').style.display = 'none';

    // Reset Loop State
    CodeHero.State.isLooping = false;
    CodeHero.State.loopBuffer = [];
    CodeHero.UI.Timeline.toggleLoopButtons(false);
    CodeHero.UI.Timeline.renderTimeline();
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.Timeline.toggleLoopButtons = function (isRecording) {
    const btnStart = document.getElementById('btn-loop-start');
    const btnEnd = document.getElementById('btn-loop-end');
    if (!btnStart || !btnEnd) return;

    if (isRecording) {
        btnStart.style.display = 'none';
        btnEnd.style.display = 'inline-block';
    } else {
        btnStart.style.display = 'block';
        btnEnd.style.display = 'none';
    }
};

CodeHero.UI.Timeline.updateLoopUI = function () {
    const tl = document.getElementById('timeline');
    if (!tl) return;

    let html = CodeHero.State.gameCommands.map((cmd, i) => {
        if (typeof cmd === 'object' && cmd.type === 'loop') {
            // New Loop Block Structure
            let internalHtml = cmd.cmds.map(subCmd => {
                const info = CodeHero.Config.COMMAND_ICONS[subCmd];
                if (!info) return '';
                return `<div class="mini-block ${info.class}">${info.icon}</div>`;
            }).join('');

            return `
            <div id="block-${i}" class="code-block loop-block" onclick="CodeHero.UI.Timeline.openEditModal(${i})">
                <div class="loop-info"><span>🔄</span> <b>x${cmd.count}</b></div>
                <div class="loop-content">${internalHtml}</div>
            </div>`;
        }
        const info = CodeHero.Config.COMMAND_ICONS[cmd];
        return `<div id="block-${i}" class="code-block ${info.class}" onclick="CodeHero.UI.Timeline.openEditModal(${i})">${info.icon} ${info.label}</div>`;
    }).join('');

    html += `<div style="display:inline-flex; align-items:center; border:2px dashed #b388ff; padding:5px; border-radius:8px; margin-left:10px">
                <span style="color:#b388ff; font-weight:bold; margin-right:5px; animation:pulse 1s infinite">🔴 REC:</span>`;

    if (CodeHero.State.loopBuffer.length === 0) {
        html += `<small style="color:#aaa">Añade pasos...</small>`;
    } else {
        html += CodeHero.State.loopBuffer.map(cmd => {
            const info = CodeHero.Config.COMMAND_ICONS[cmd];
            return `<div class="code-block ${info.class}" style="transform:scale(0.9)">${info.icon}</div>`;
        }).join('');
    }
    html += `</div>`;

    tl.innerHTML = html;
    tl.scrollLeft = tl.scrollWidth;
    CodeHero.UI.Timeline.updateConsole();
};

CodeHero.UI.Timeline.renderTimeline = function () {
    const tl = document.getElementById('timeline');
    if (!tl) return;
    tl.innerHTML = '';

    if (CodeHero.State.gameCommands.length === 0) {
        tl.innerHTML = '<span style="color:#666;font-size:0.8rem;margin:auto">Añade comandos...</span>';
        CodeHero.UI.Timeline.updateConsole();
        return;
    }

    CodeHero.State.gameCommands.forEach((cmd, i) => {
        const b = document.createElement('div');
        if (typeof cmd === 'object' && cmd.type === 'loop') {
            b.id = `block-${i}`;
            b.className = `code-block loop-block`;
            // Internal Content
            let internalHtml = cmd.cmds.map(subCmd => {
                const info = CodeHero.Config.COMMAND_ICONS[subCmd];
                if (!info) return '';
                return `<div class="mini-block ${info.class}">${info.icon}</div>`;
            }).join('');

            b.innerHTML = `
                <div class="loop-info">
                    <div style="display:flex; align-items:center; gap:5px">
                        <span>🔄</span> <b>x${cmd.count}</b>
                    </div>
                    <button class="btn-edit-loop" style="background:none; border:none; color:var(--gold); font-size:0.9rem; cursor:pointer;" onclick="event.stopPropagation(); CodeHero.UI.Timeline.openEditModal(${i})">✏️</button>
                </div>
                <div class="loop-content">${internalHtml}</div>
            `;
            b.onclick = () => CodeHero.UI.Timeline.openEditModal(i);
        } else {
            const info = CodeHero.Config.COMMAND_ICONS[cmd];
            b.id = `block-${i}`;
            b.className = `code-block ${info.class}`;
            b.innerHTML = `${info.icon} ${info.label}`;
            // Remove click handler to prevent opening modal
            // b.onclick = () => CodeHero.UI.Timeline.openEditModal(i);
            // Actually, keep it read-only or allow opening but no edit?
            // User said "only loop block editable".
            // Safest is to remove onclick entirely or show a "read-only" modal?
            // Let's remove onclick to be strict.
        }
        tl.appendChild(b);
    });
    tl.scrollLeft = tl.scrollWidth;
    CodeHero.UI.Timeline.updateConsole();
};

CodeHero.UI.Timeline.addLoopStep = function (type) {
    const idx = CodeHero.UI.Timeline.currentEditIndex;
    if (idx !== null) {
        const cmd = CodeHero.State.gameCommands[idx];
        if (cmd && cmd.type === 'loop') {
            cmd.cmds.push(type);
            // Re-render modal to show new step
            CodeHero.UI.Timeline.openEditModal(idx);
            // Update main timeline
            CodeHero.UI.Timeline.renderTimeline();
            CodeHero.UI.UIRenderer.updateHUD();
        }
    }
};

// --- EDIT MODAL LOGIC ---
CodeHero.UI.Timeline.currentEditIndex = null;
CodeHero.UI.Timeline.tempEditLoopCount = 4;

CodeHero.UI.Timeline.openEditModal = function (index) {
    if (CodeHero.State.isLooping) return;

    CodeHero.UI.Timeline.currentEditIndex = index;
    const cmd = CodeHero.State.gameCommands[index];
    const modal = document.getElementById('modal-edit-block');
    const contentCmd = document.getElementById('edit-content-command');
    const contentLoop = document.getElementById('edit-content-loop');
    const stepsContainer = document.getElementById('edit-loop-steps');

    if (!modal) return;

    modal.style.display = 'flex';

    if (typeof cmd === 'object' && cmd.type === 'loop') {
        contentCmd.style.display = 'none';
        contentLoop.style.display = 'flex';
        CodeHero.UI.Timeline.tempEditLoopCount = cmd.count;
        document.getElementById('edit-loop-count').innerText = cmd.count;

        // Render Inner Commands
        if (stepsContainer) {
            stepsContainer.innerHTML = cmd.cmds.map((subCmd, subIdx) => {
                const info = CodeHero.Config.COMMAND_ICONS[subCmd];
                if (!info) return '';
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:5px; border-radius:4px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.2rem">${info.icon}</span>
                        <span style="font-size:0.8rem">${info.label}</span>
                    </div>
                    <button style="background:none; border:none; cursor:pointer;" onclick="CodeHero.UI.Timeline.deleteLoopStep(${subIdx})">❌</button>
                </div>`;
            }).join('');
        }

    } else {
        contentLoop.style.display = 'none';
        contentCmd.style.display = 'flex';
    }
};

CodeHero.UI.Timeline.deleteLoopStep = function (subIdx) {
    const idx = CodeHero.UI.Timeline.currentEditIndex;
    if (idx !== null) {
        const cmd = CodeHero.State.gameCommands[idx];
        if (cmd && cmd.type === 'loop') {
            cmd.cmds.splice(subIdx, 1);
            // If loop is empty, remove the whole block? Or keep empty? 
            // Let's keep empty usage simple for now, maybe remove if empty?
            if (cmd.cmds.length === 0) {
                CodeHero.State.gameCommands.splice(idx, 1);
                CodeHero.UI.Timeline.closeEditModal();
            } else {
                // Re-render only modal list + timeline
                CodeHero.UI.Timeline.openEditModal(idx); // Refresh modal list
            }
            CodeHero.UI.Timeline.renderTimeline();
            CodeHero.UI.UIRenderer.updateHUD();
        }
    }
};

CodeHero.UI.Timeline.closeEditModal = function () {
    document.getElementById('modal-edit-block').style.display = 'none';
    CodeHero.UI.Timeline.currentEditIndex = null;
};

CodeHero.UI.Timeline.applyEdit = function (newType) {
    const idx = CodeHero.UI.Timeline.currentEditIndex;
    if (idx !== null) {
        CodeHero.State.gameCommands[idx] = newType;
        CodeHero.UI.Timeline.renderTimeline();
        CodeHero.UI.UIRenderer.updateHUD();
    }
    CodeHero.UI.Timeline.closeEditModal();
};

window.adjustEditLoop = function (delta) {
    let count = CodeHero.UI.Timeline.tempEditLoopCount + delta;
    if (count < 1) count = 1;
    if (count > 20) count = 20;
    CodeHero.UI.Timeline.tempEditLoopCount = count;
    document.getElementById('edit-loop-count').innerText = count;
};

CodeHero.UI.Timeline.applyEditLoop = function () {
    const idx = CodeHero.UI.Timeline.currentEditIndex;
    if (idx !== null && CodeHero.State.gameCommands[idx].type === 'loop') {
        CodeHero.State.gameCommands[idx].count = CodeHero.UI.Timeline.tempEditLoopCount;
        CodeHero.UI.Timeline.renderTimeline();
        CodeHero.UI.UIRenderer.updateHUD();
    }
    CodeHero.UI.Timeline.closeEditModal();
};

CodeHero.UI.Timeline.deleteCurrentEdit = function () {
    const idx = CodeHero.UI.Timeline.currentEditIndex;
    if (idx !== null) {
        CodeHero.State.gameCommands.splice(idx, 1);
        CodeHero.UI.Timeline.renderTimeline();
        CodeHero.UI.UIRenderer.updateHUD();
    }
    CodeHero.UI.Timeline.closeEditModal();
};

CodeHero.UI.Timeline.updateConsole = function () {
    const consoleEl = document.getElementById('code-console');
    if (!consoleEl) return;

    if (CodeHero.State.gameCommands.length === 0) {
        consoleEl.innerHTML = '// Tu código JavaScript aparecerá aquí...';
        return;
    }

    let codeHtml = '<div style="color:#666; font-style:italic">// Inicio del programa</div>';

    CodeHero.State.gameCommands.forEach((cmd, i) => {
        if (typeof cmd === 'object' && cmd.type === 'loop') {
            // Loop wrapper
            codeHtml += `<div id="console-line-${i}" class="console-line">for (let i = 0; i < ${cmd.count}; i++) {</div>`;
            cmd.cmds.forEach((subCmd, j) => {
                const info = CodeHero.Config.COMMAND_ICONS[subCmd];
                // Indented inner command with composite ID
                codeHtml += `<div id="console-line-${i}-${j}" class="console-line" style="padding-left: 20px;">${info.code}</div>`;
            });
            codeHtml += `<div class="console-line">}</div>`;
        } else {
            const info = CodeHero.Config.COMMAND_ICONS[cmd];
            codeHtml += `<div id="console-line-${i}" class="console-line">${info.code}</div>`;
        }
    });

    consoleEl.innerHTML = codeHtml;
    consoleEl.scrollTop = consoleEl.scrollHeight;
};

CodeHero.UI.Timeline.removeLastCmd = function () {
    if (CodeHero.State.isLooping) {
        CodeHero.State.loopBuffer.pop();
        CodeHero.UI.Timeline.updateLoopUI();
    } else {
        CodeHero.State.gameCommands.pop();
        CodeHero.UI.Timeline.renderTimeline();
    }
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.Timeline.clearCmds = function () {
    CodeHero.State.gameCommands = [];
    CodeHero.State.isLooping = false;
    CodeHero.State.loopBuffer = [];
    CodeHero.State.heroPos = { ...CodeHero.State.currentLevel.start, dir: 1 };
    CodeHero.UI.GridRenderer.initGameMap();
    CodeHero.UI.Timeline.toggleLoopButtons(false);
    CodeHero.UI.Timeline.renderTimeline();
};

// Global Helper for HTML OnClick
window.removeCmd = function (index) {
    if (CodeHero.State.isLooping) return;
    CodeHero.State.gameCommands.splice(index, 1);
    CodeHero.UI.Timeline.renderTimeline();
    CodeHero.UI.UIRenderer.updateHUD();
};

CodeHero.UI.Timeline.highlightBlock = function (uiIndex, consoleId) {
    // Clear previous highlights
    CodeHero.UI.Timeline.clearHighlights();

    if (uiIndex !== null && uiIndex !== undefined) {
        const block = document.getElementById(`block-${uiIndex}`);
        if (block) {
            block.classList.add('active-block');
            block.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    if (consoleId) {
        const line = document.getElementById(`console-line-${consoleId}`);
        if (line) {
            line.classList.add('active-console-line');
            line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
};

CodeHero.UI.Timeline.clearHighlights = function () {
    const activeBlocks = document.querySelectorAll('.active-block');
    activeBlocks.forEach(el => el.classList.remove('active-block'));

    const activeLines = document.querySelectorAll('.active-console-line');
    activeLines.forEach(el => el.classList.remove('active-console-line'));
};
