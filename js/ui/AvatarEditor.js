// CONFIGURACIÓN DE COLORES HEXADECIMALES PUROS (SIN #)
// CONFIGURACIÓN DE COLORES HEXADECIMALES PUROS (SIN #)
CodeHero.UI.ASSETS = {
    // Colores (API v9 requiere hex 6 digitos)
    skinColor: [
        'f8d25c', 'ffdbb4', 'edb98a', 'fd9841', 'd08b5b', 'ae5d29', '614335', // Humanos
        '62c462', // Hulk Green
        '64b5f6', // Mystique Blue
        'bdbdbd', // Colossus Grey
        'ef5350', // Hellboy Red
        '9575cd', // Thanos Purple
        'ffeb3b'  // The Simpson Yellow
    ],
    hairColor: [
        '2c1b18', '4a312c', '724133', 'a55728', 'd6b370', 'f59797', 'ecdcbf', 'b58143', // Naturales
        'ff0000', '00ff00', '0000ff', 'ff00ff', '00ffff', 'ffffff' // Fantasía (Anime/Hero)
    ],
    facialHairColor: ['2c1b18', '4a312c', '724133', 'a55728', 'd6b370', 'f59797', 'ecdcbf', 'b58143'],
    // Colores vibrantes para Ropa y Gafas
    clothingColor: [
        '262e33', '65c9ff', '5199e4', '25557c', 'ff5c5c', 'ff488e', 'ffffb1', 'ffffff',
        '3c4f76', 'd32f2f', '4caf50', 'ffca28', 'ab47bc', '000000' // Colores Heroicos
    ],
    accessoriesColor: ['262e33', '65c9ff', 'ff5c5c', 'ffffff', '000000', 'ffd700'],

    // Formas
    top: [
        'shortFlat', 'shortRound', 'theCaesar', 'shortCurly', 'shortDreads1', 'bigHair', 'bob', 'bun', 'curly',
        'straight01', 'winterHat1', 'hat', 'turban', 'hijab', 'eyepatch', 'noHair',
        'longButNotTooLong', 'shavedSides', 'frida', 'fro', 'miaWallace' // Nuevos
    ],
    facialHair: ['beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'],
    clothing: [
        'blazerAndShirt', 'blazerAndSweater', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck',
        'collarAndSweater', 'graphicShirt' // Nuevos
    ],
    accessories: ['kurt', 'prescription01', 'round', 'sunglasses', 'wayfarers', 'prescription02'],
    // BOTS ASSETS
    botColor: ['00acc1', '5e35b1', '1e88e5', '43a047', 'fdd835', 'fb8c00', 'e53935', '546e7a', 'eeeeee', '212121'],
    botTop: ['antenna', 'antennaCrooked', 'bulb01', 'glowingBulb01', 'glowingBulb02', 'horns', 'lights', 'pyramid', 'radar'], // Valid v7 values
    botFace: ['round01', 'round02', 'square01', 'square02', 'square03', 'square04'], // Removed invalid 'squaredXX'
    botSides: ['antenna01', 'antenna02', 'cables01', 'cables02', 'square', 'round', 'squareAssymetric'], // Removed invalid 'fans01'
    botTexture: ['dots', 'circuits', 'camo01', 'camo02', 'dirty01', 'dirty02', 'grunge01', 'grunge02'] // Fixed 'squares', 'circuitXX' -> 'circuits'
};

CodeHero.UI.drawAvatar = function (cfg, seed) {
    // Default config
    const def = { type: 'human', skinColor: 0, top: 0, hairColor: 0, facialHair: 0, facialHairColor: 0, clothing: 4, clothingColor: 4, accessories: 0, accessoriesColor: 0, botColor: 0, botSecondaryColor: 0, botTop: 0, botFace: 0, botSides: 0, botTexture: 6 };
    cfg = { ...def, ...cfg };
    if (!seed) seed = 'robot'; // Default seed if none provided

    const ASSETS = CodeHero.UI.ASSETS;
    const getVal = (key, idx) => ASSETS[key][idx] || ASSETS[key][0];

    // MODO ROBOT (BOTTTS) - API v7.x (Soporte explícito de partes)
    if (cfg.type === 'bot') {
        const params = [
            `seed=${seed}`, // Use explicit seed for consistency
            `baseColor=${getVal('botColor', cfg.botColor)}`, // v7 schema uses baseColor for body
            `sides=${getVal('botSides', cfg.botSides)}`,
            `top=${getVal('botTop', cfg.botTop)}`,
            `face=${getVal('botFace', cfg.botFace)}`,
            `texture=${getVal('botTexture', cfg.botTexture)}`,
            `textureProbability=100`, // Force texture to always show
            `scale=80`, `translateY=5`
        ];
        // v7.x soporta personalización granular
        const url = `https://api.dicebear.com/7.x/bottts/svg?${params.join('&')}`;
        return `<img src="${url}" style="width:100%; height:100%; object-fit:contain;">`;
    }

    // MODO HUMANO (AVATAAARS)
    const params = [
        `skinColor=${getVal('skinColor', cfg.skinColor)}`,
        `top=${getVal('top', cfg.top)}`,
        `hairColor=${getVal('hairColor', cfg.hairColor)}`,
        `facialHairColor=${getVal('facialHairColor', cfg.facialHairColor)}`,
        `clothing=${getVal('clothing', cfg.clothing)}`,
        `clothesColor=${getVal('clothingColor', cfg.clothingColor)}`,
        `hatColor=${getVal('clothingColor', cfg.clothingColor)}`, // FIX: Sombreros toman color de ropa
        `accessoriesColor=${getVal('accessoriesColor', cfg.accessoriesColor)}`,
        `mouth=smile`, `eyes=default`,
        `scale=75`, `translateY=10`
    ];

    if (cfg.facialHair === 0) params.push('facialHairProbability=0');
    else {
        params.push(`facialHair=${ASSETS.facialHair[cfg.facialHair - 1] || 'beardMedium'}`);
        params.push('facialHairProbability=100');
    }

    if (cfg.accessories === 0) params.push('accessoriesProbability=0');
    else {
        params.push(`accessories=${ASSETS.accessories[cfg.accessories - 1] || 'kurt'}`);
        params.push('accessoriesProbability=100');
    }

    const url = `https://api.dicebear.com/9.x/avataaars/svg?${params.join('&')}`;
    return `<img src="${url}" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='https://api.dicebear.com/9.x/avataaars/svg?seed=Error'">`;
};

// Agrega el # para CSS
CodeHero.UI.getUIHex = function (category, index) { return '#' + CodeHero.UI.ASSETS[category][index]; };