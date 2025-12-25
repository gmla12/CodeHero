CodeHero.Core.LoopSystem = function () {
    this.isLooping = false;
    this.buffer = [];
};

CodeHero.Core.LoopSystem.prototype.startRecording = function () {
    if (this.isLooping) return false;
    this.isLooping = true;
    this.buffer = [];
    return true;
};

CodeHero.Core.LoopSystem.prototype.addToBuffer = function (cmd) {
    if (!this.isLooping) return false;
    this.buffer.push(cmd);
    return true;
};

CodeHero.Core.LoopSystem.prototype.stopRecording = function () {
    if (!this.isLooping) return null;
    this.isLooping = false;
    const result = [...this.buffer];
    this.buffer = [];
    return result;
};

CodeHero.Core.LoopSystem.prototype.removeFromBuffer = function () {
    if (!this.isLooping) return false;
    this.buffer.pop();
    return true;
};

CodeHero.Core.LoopSystem.prototype.clear = function () {
    this.isLooping = false;
    this.buffer = [];
};

// Singleton
CodeHero.Core.loopSystem = new CodeHero.Core.LoopSystem();
