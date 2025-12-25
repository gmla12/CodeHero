CodeHero.Managers.BotManager = {};

CodeHero.Managers.BotManager.updateScores = function () {
    if (!CodeHero.State.currentUser) return;

    CodeHero.State.db.users.forEach((u, i) => {
        if (i !== CodeHero.State.currentUserIdx && u.isBot) {
            let target = CodeHero.State.currentUser.score;

            if (u.name === "Dra. Código") {
                u.score = Math.max(u.score, target + 150);
                u.maxLevel = Math.max(u.maxLevel, CodeHero.State.currentUser.maxLevel + 1);
            } else if (u.name === "Robo-Rival") {
                let diff = target - u.score;
                u.score += Math.floor(diff * 0.8) + Math.floor(Math.random() * 100);
            } else {
                u.score += 50;
            }
        }
    });

    CodeHero.State.db.users.sort((a, b) => b.score - a.score);
    CodeHero.State.currentUserIdx = CodeHero.State.db.users.findIndex(u => u.name === CodeHero.State.currentUser.name);
    CodeHero.Managers.DataManager.saveData();
};
