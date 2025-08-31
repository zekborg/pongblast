// /src/scenes/UIScene.js
// Minimal HUD: shows Player, Enemy, and Rally count.

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    this.bus = data.bus;
    this.score = data.score; // ScoreManager
  }

  create() {
    const { width } = this.scale;

    this.text = this.add.text(
      width / 2, 12,
      this.formatLine({ player: 0, enemy: 0, rally: 0 }),
      { fontFamily: 'Arial', fontSize: 16, color: '#ffffff' }
    ).setOrigin(0.5, 0);

    // update whenever scores/rally change
    this.bus.on('score:changed', (state) => {
      this.text.setText(this.formatLine(state));
    });
  }

  formatLine({ player, enemy, rally }) {
    return `You: ${player}    Enemy: ${enemy}    Rally: ${rally}`;
  }
}
