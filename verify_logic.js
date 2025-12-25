
// Mock Global CodeHero
global.CodeHero = {
    State: {
        currentMap: [],
        heroPos: { x: 0, y: 0, dir: 1 },
        hasKey: false,
        gameCommands: [],
        currentLevel: null
    },
    UI: {
        GridRenderer: {
            updateCell: (x, y, v) => console.log(`[UI] Cell Update ${x},${y} -> ${v}`),
            updateHeroVisuals: () => { }
        },
        UIRenderer: {
            updateHUD: () => console.log(`[UI] HUD Updated. HasKey: ${CodeHero.State.hasKey}`)
        }
    }
};

// Mock Document/Window basics
global.document = {
    querySelector: () => ({ style: {} }),
    getElementById: () => ({ innerText: '', classList: { add: () => { }, remove: () => { } } })
};
global.window = {};

// Level Data (Copied from levels.js ID 9)
const LEVEL_9 = {
    id: 9, title: "El Recado",
    map: [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 3, 0, 0, 0, 2, 1], // Door(1,1). Key(5,1). Start(2,1).
        [1, 1, 1, 1, 1, 1, 1]
    ],
    start: { x: 2, y: 1 }, end: { x: 0, y: 1 }
};

// State Init
CodeHero.State.currentMap = JSON.parse(JSON.stringify(LEVEL_9.map));
CodeHero.State.heroPos = { ...LEVEL_9.start, dir: 1 }; // Dir 1 = Right
CodeHero.State.hasKey = false;
console.log("INITIAL STATE:", CodeHero.State.heroPos);

// Simulate GameEngine.moveForward logic (The EXACT logic we just wrote)
function moveHero() {
    const { x, y, dir } = CodeHero.State.heroPos;
    let nx = x, ny = y;
    if (dir === 0) ny--;
    if (dir === 1) nx++;
    if (dir === 2) ny++;
    if (dir === 3) nx--;

    console.log(`Trying Move: (${x},${y}) -> (${nx},${ny})`);

    const cell = CodeHero.State.currentMap[ny] ? CodeHero.State.currentMap[ny][nx] : undefined;
    console.log("Target Cell Content:", cell);

    if (cell === undefined || cell === 1) {
        console.log("Blocked by Wall/Bound");
        return;
    }

    if (cell === 3) {
        if (CodeHero.State.hasKey) {
            console.log("DOOR UNLOCKED! Passing.");
            CodeHero.State.heroPos.x = nx; CodeHero.State.heroPos.y = ny;
            CodeHero.State.currentMap[ny][nx] = 0;
        } else {
            console.log("DOOR LOCKED. Blocked.");
        }
        return;
    }

    // Default Move
    CodeHero.State.heroPos.x = nx; CodeHero.State.heroPos.y = ny;

    // Interact
    if (cell === 2) {
        console.log("KEY COLLECTED!");
        CodeHero.State.hasKey = true;
        CodeHero.State.currentMap[ny][nx] = 0;
    }
}

// --- TEST SEQUENCE ---

console.log("\n--- STEP 1: Move to Key ---");
// Start (2,1). Key is at (5,1). Need 3 moves Right.
moveHero(); // to 3,1
moveHero(); // to 4,1
moveHero(); // to 5,1 (KEY)

console.log("\n--- STEP 2: Return to Door ---");
// Turn Around (Simulated by setting dir)
CodeHero.State.heroPos.dir = 3; // Left
console.log("Turned Left. Dir:", CodeHero.State.heroPos.dir);

// Move from 5,1 to 1,1 (Door). Distance 4.
moveHero(); // to 4,1
moveHero(); // to 3,1
moveHero(); // to 2,1
moveHero(); // to 1,1 (DOOR)

console.log("\n--- FINAL STATE ---");
console.log("Pos:", CodeHero.State.heroPos);
console.log("HasKey:", CodeHero.State.hasKey);

if (CodeHero.State.heroPos.x === 1 && CodeHero.State.heroPos.y === 1 && CodeHero.State.hasKey) {
    console.log("SUCCESS: Hero passed the door!");
} else {
    console.log("FAILURE: Hero did not pass the door.");
}
