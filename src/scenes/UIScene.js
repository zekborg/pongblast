// /src/scenes/UIScene.js
import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    // Expect { bus, score }
    this.bus = data?.bus ?? null;
    this.score = data?.score ?? null;
  }

  create() {
    const { width } = this.scale;

    const totals = this.score?.getTotals?.() ?? { player: 0, enemy: 0, rally: 0 };

    // Single centered HUD line at the very top
    this.hudText = this.add.text(width / 2, 10, this._fmt(totals.player, totals.enemy, totals.rally), {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    })
      .setOrigin(0.5, 0)     // centered horizontally, stick to top
      .setScrollFactor(0)
      .setDepth(2000);

    // Live updates
    this.bus?.on('score:changed', ({ player, enemy }) => {
      const r = this.score?.getTotals?.().rally ?? 0;
      this.hudText?.setText(this._fmt(player, enemy, r));
    });

    this.bus?.on('rally:changed', ({ rally }) => {
      const t = this.score?.getTotals?.() ?? { player: 0, enemy: 0, rally: 0 };
      this.hudText?.setText(this._fmt(t.player, t.enemy, rally));
    });

    // Keep centered on resize
    this.scale.on('resize', (gameSize) => {
      this.hudText?.setPosition(gameSize.width / 2, 10);
    });
  }

  _fmt(player, enemy, rally) {
    return `You: ${player}   Enemy: ${enemy}   Rally: ${rally}`;
  }
}
