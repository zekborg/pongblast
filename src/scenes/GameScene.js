// /src/scenes/GameScene.js
import Phaser from 'phaser';
import Paddle from '../objects/Paddle.js';
import Ball from '../objects/Ball.js';
import BlockGrid from '../objects/blocks/BlockGrid.js';
import EventBus from '../utils/EventBus.js';
import ScoreManager from '../utils/ScoreManager.js';
import UIScene from './UIScene.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;

    // --- Systems: ONE bus + ONE score manager
    this.bus = new EventBus();
    this.score = new ScoreManager(this.bus); // emits initial state

    // HUD
    if (!this.scene.get('UIScene')) {
      this.scene.add('UIScene', UIScene, true, { bus: this.bus, score: this.score });
    } else {
      this.scene.launch('UIScene', { bus: this.bus, score: this.score });
    }

    // Center label
    this.add.text(width / 2, height / 2, 'PongBlast — Ready', {
      fontFamily: 'Arial', fontSize: 28, color: '#ffffff'
    }).setOrigin(0.5);

    // Dotted midline
    const g = this.add.graphics();
    g.lineStyle(2, 0xffffff, 0.35);
    for (let y = 0; y < height; y += 16) g.lineBetween(width / 2, y, width / 2, y + 8);

    // Bottom instructions
    this.add.text(width / 2, height - 20, 'Space: serve   |   ↑/↓: move', {
      fontFamily: 'Arial', fontSize: 14, color: '#cccccc'
    })
      .setOrigin(0.5, 1)
      .setDepth(10);

    // --- Grid layout (3 cols × 5 rows) behind paddles
    const rows = 5, cols = 3;
    const edgeInset = 18, marginY = 8, gap = 2;
    const cellW = 40;
    const cellH = (height - 2 * marginY) / rows;
    const gridWidth = cols * cellW;

    const leftOriginX = edgeInset;
    const leftOriginY = marginY;
    const leftFrontCenterX = leftOriginX + gridWidth - cellW / 2;

    const rightOriginX = width - edgeInset - gridWidth;
    const rightOriginY = marginY;
    const rightFrontCenterX = rightOriginX + cellW / 2;

    // Paddles IN FRONT of grids
    const clearance = 16;
    const playerX = leftFrontCenterX + clearance;
    const enemyX  = rightFrontCenterX - clearance;

    this.player = new Paddle(this, playerX, height / 2, 'left');
    this.enemy  = new Paddle(this, enemyX,  height / 2, 'right');
    this.player.node.setDepth(100);
    this.enemy.node.setDepth(100);

    // Ball (pass the shared bus)
    this.ball = new Ball(this, width / 2, height / 2, this.bus);

    // Colliders: NO angle/edge tweaking—let physics be uniform.
    this.physics.add.collider(
      this.ball.node,
      this.player.node,
      () => this.onBallHitsPaddle(this.player),
      null,
      this
    );
    this.physics.add.collider(
      this.ball.node,
      this.enemy.node,
      () => this.onBallHitsPaddle(this.enemy),
      null,
      this
    );

    // Grids
    this.playerGrid = new BlockGrid(this, {
      cols, rows, cellW, cellH, originX: leftOriginX,  originY: leftOriginY,  owner: 'player', gap, bus: this.bus
    });
    this.playerGrid.fillAll({ hp: 3 });

    this.enemyGrid = new BlockGrid(this, {
      cols, rows, cellW, cellH, originX: rightOriginX, originY: rightOriginY, owner: 'enemy',  gap, bus: this.bus
    });
    this.enemyGrid.fillAll({ hp: 3 });

    this.playerGrid.bindBall(this.ball);
    this.enemyGrid.bindBall(this.ball);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  onBallHitsPaddle(paddle) {
    // Estimate paddle vertical velocity if available; else 0
    const paddleVelY = paddle.node.body?.velocity?.y ?? 0;

    // Uniform paddle face: pass "0" for impactOffset (ignored in Ball)
    const side = (paddle === this.player) ? 'player' : 'enemy';
    this.ball.onPaddleContact(side, 0, paddleVelY);

    // Keep speed progression spicy but uniform
    this.ball.ratchetSpeed();
  }

  update(time, dtMs) {
    const dt = dtMs / 1000;

    // Serve
    if (this.ball.state === 'serve' && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      const dir = Phaser.Math.Between(0, 1) === 0 ? 'left' : 'right';
      this.ball.serve(dir);
      this.score.resetRally(); // clear rally tally at (re)serve
    }

    // Player control
    let dirY = 0;
    if (this.cursors.up.isDown) dirY = -1;
    else if (this.cursors.down.isDown) dirY = 1;
    this.player.move(dirY, dt);

    // Simple AI
    if (this.ball.state === 'live' && this.ball.body.velocity.x > 0) {
      this.enemy.follow(this.ball.node.y, dt, 0.8);
    }

    // Drive Ball's spin + rally logic
    this.ball.update?.(time, dtMs);

    // Out-of-bounds: reset and clear rally
    const x = this.ball.node.x;
    const w = this.scale.width;
    if (this.ball.state === 'live' && (x < -10 || x > w + 10)) {
      this.ball.resetToCenter();
      this.score.resetRally();
    }
  }
}
