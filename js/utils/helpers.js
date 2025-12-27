CodeHero.Utils.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

CodeHero.Utils.flattenCommands = function (cmds, parentIndex = null) {
    let flat = [];
    cmds.forEach((c, i) => {
        // Construct hierarchy ID (e.g., "0", "1", "1-0", "1-1")
        const currentId = (parentIndex !== null) ? `${parentIndex}-${i}` : `${i}`;

        // UI Index logic: logical parent index for loops, distinct for flat commands
        // If parentIndex is set, we are INSIDE a loop. The UI Block is the Loop Block itself (parentIndex's root).
        // Wait, the previous logic passed 'overrideIndex'. 
        // If I am in a loop at index 1, the UI block is 1. Children should highlight block 1.
        // Let's preserve the existing uiIndex logic but clarify it.
        const effectiveUiIndex = (parentIndex !== null) ? parentIndex.toString().split('-')[0] : i;

        if (typeof c === 'object' && c.type === 'loop') {
            for (let k = 0; k < c.count; k++) {
                // For the loop itself, we don't execute the "loop" object, we execute clarity.
                // But the loop wrapper generates children.
                // We pass 'currentId' as the new parent for recursion.
                flat = flat.concat(CodeHero.Utils.flattenCommands(c.cmds, currentId));
            }
        } else {
            // It's a runnable command
            // uiIndex: The ID of the block in the timeline (to highlight the block)
            // consoleId: The ID of the line in the console (to highlight the text)
            flat.push({
                action: c,
                uiIndex: parseInt(effectiveUiIndex),
                consoleId: currentId
            });
        }
    });
    return flat;
};

CodeHero.Utils.generateUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
