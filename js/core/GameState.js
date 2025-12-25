CodeHero.State = {
    db: { users: [] },
    currentUser: null,
    currentUserIdx: -1,
    currentLevel: null,
    currentMap: [],
    hasKey: false,
    heroPos: { x: 0, y: 0, dir: 0 },
    gameCommands: [],
    isLooping: false,
    loopBuffer: [],
    tempAvatar: { skinColor: 0, top: 0, hairColor: 0, facialHair: 0, facialHairColor: 0, clothing: 4, clothingColor: 4, accessories: 0, accessoriesColor: 0 }
};

CodeHero.State.resetLevelState = function (level) {
    CodeHero.State.currentLevel = level;
    CodeHero.State.currentMap = JSON.parse(JSON.stringify(level.map));
    CodeHero.State.hasKey = false;
    CodeHero.State.isLooping = false;
    CodeHero.State.loopBuffer = [];
    CodeHero.State.gameCommands = [];
    CodeHero.State.heroPos = { ...level.start, dir: 1 };
};
