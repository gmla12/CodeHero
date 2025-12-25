// Inicializar Namespace Global
window.CodeHero = {
    Config: {},
    Data: {},
    State: {},
    Core: {},
    UI: {},
    Managers: {},
    Utils: {}
};

// Constantes
CodeHero.Config.COMMAND_ICONS = {
    'moveForward': { icon: '⬆', label: 'Avanzar', class: 'block-move', code: 'hero.move();' },
    'turnLeft': { icon: '↺', label: 'Girar Izq', class: 'block-turn', code: 'hero.turnLeft();' },
    'turnRight': { icon: '↻', label: 'Girar Der', class: 'block-turn', code: 'hero.turnRight();' }
};

CodeHero.Config.CONTROL_GROUPS = [
    // HUMANOS
    { id: 'skinColor', label: 'Color Piel', type: 'color', tab: 'rasgos', usage: 'human' },
    { id: 'top', label: 'Peinado', type: 'shape', tab: 'rasgos', usage: 'human' },
    { id: 'hairColor', label: 'Color Pelo', type: 'color', tab: 'rasgos', usage: 'human' },

    { id: 'facialHair', label: 'Barba', type: 'shape', tab: 'rostro', usage: 'human' },
    { id: 'facialHairColor', label: 'Color Barba', type: 'color', tab: 'rostro', usage: 'human' },
    { id: 'accessories', label: 'Gafas', type: 'shape', tab: 'rostro', usage: 'human' },
    { id: 'accessoriesColor', label: 'Color Gafas', type: 'color', tab: 'rostro', usage: 'human' },

    { id: 'clothing', label: 'Ropa', type: 'shape', tab: 'outfit', usage: 'human' },
    { id: 'clothingColor', label: 'Color Ropa', type: 'color', tab: 'outfit', usage: 'human' },

    // BOTS (NUEVO)
    { id: 'botTop', label: 'Cabeza/Casco', type: 'shape', tab: 'rasgos', usage: 'bot' },
    { id: 'botFace', label: 'Cara/Sensor', type: 'shape', tab: 'rostro', usage: 'bot' },
    { id: 'botSides', label: 'Accesorios', type: 'shape', tab: 'rostro', usage: 'bot' },
    { id: 'botColor', label: 'Pintura', type: 'color', tab: 'outfit', usage: 'bot' }, // Moved & Renamed
    { id: 'botTexture', label: 'Textura', type: 'shape', tab: 'outfit', usage: 'bot' }
];

CodeHero.Config.BOTS_DATA = [
    { name: "Dra. Código", avatar: { skinColor: 1, top: 4, hairColor: 2, facialHair: 0, clothing: 1, accessories: 1 }, baseScore: 500 },
    { name: "Robo-Rival", avatar: { skinColor: 6, top: 15, hairColor: 0, facialHair: 3, clothing: 3, accessories: 3 }, baseScore: 300 },
    { name: "Bug Hunter", avatar: { skinColor: 3, top: 12, hairColor: 4, facialHair: 0, clothing: 2, accessories: 4 }, baseScore: 100 }
];
