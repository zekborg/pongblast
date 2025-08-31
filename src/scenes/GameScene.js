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

    // --- Systems: bus + score + HUD scene ---
    this.bus = new EventBus();
    this.score = new ScoreManager(this.bus);
    if (!this.scene.get('UIScene')) {
      this.scene.add('UIScene', UIScene, true, { bus: this.bus, score: this.score });
    } else {
      this.scene.launch('UIScene', { bus: this.bus, score: this.score });
    }

    // Center label + dotted midline
    this.add.text(width / 2, height / 2, 'PongBlast — Ready', {
      fontFamily: 'Arial', fontSize: 28, color: '#ffffff'
    }).setOrigin(0.5);

    const g = this.add.graphics();
    g.lineStyle(2, 0xffffff, 0.35);
    for (let y = 0; y < height; y += 16) g.lineBetween(width / 2, y, width / 2, y + 8);

    this.add.text(12, 8, 'Slice: rally awards +1 on midline cross (Space to serve; ↑/↓ to move)', {
      fontFamily: 'Arial', fontSize: 14, color: '#cccccc'
    });

    // --- Grid layout (3 cols × 5 rows) behind paddles ---
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

    // Ball
    this.ball = new Ball(this, width / 2, height / 2);

    // Paddle collisions (also attribute last hitter + rally)
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

    // Grids (pass bus so block hits/destroys score)
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

    // Rally + midline tracking
    this.rallyCount = 0;
    this.prevBallX = this.ball.node.x; // for midline crossing detection
  }

  onBallHitsPaddle(paddle) {
    // Aim based on impact point along the paddle
    const diff = (this.ball.node.y - paddle.node.y) / (paddle.node.height / 2); // -1..1
    const v = new Phaser.Math.Vector2(
      this.ball.body.velocity.x,
      this.ball.body.velocity.y
    );
    v.y += diff * 140;
    this.ball.body.setVelocity(v.x, v.y);

    // Attribute hitter & update rally counter
    this.ball.lastHitBy = (paddle === this.player) ? 'player' : 'enemy';
    this.rallyCount++;
    this.bus.emit('rally:changed', { rally: this.rallyCount });

    // Speed ratchet
    this.ball.ratchetSpeed();
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;
    const { width } = this.scale;
    const mid = width / 2;

    // Serve
    if (this.ball.state === 'serve' && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      const dir = Phaser.Math.Between(0, 1) === 0 ? 'left' : 'right';
      this.ball.serve(dir);
      this.rallyCount = 0;
      this.bus.emit('rally:changed', { rally: this.rallyCount });
      this.prevBallX = this.ball.node.x;
    }

    // Player control
    let dir = 0;
    if (this.cursors.up.isDown) dir = -1;
    else if (this.cursors.down.isDown) dir = 1;
    this.player.move(dir, dt);

    // Simple AI
    if (this.ball.state === 'live' && this.ball.body.velocity.x > 0) {
      this.enemy.follow(this.ball.node.y, dt, 0.8);
    }

    // Award rally points on midline crossings to whoever LAST hit the ball
    if (this.ball.state === 'live') {
      const x = this.ball.node.x;
      const crossedFromLeft  = this.prevBallX <  mid && x >= mid;
      const crossedFromRight = this.prevBallX >  mid && x <= mid;

      if ((crossedFromLeft || crossedFromRight) && this.ball.lastHitBy) {
        this.score.award(this.ball.lastHitBy, 1); // emits 'score:changed' via ScoreManager
      }
      this.prevBallX = x;
    }

    // Out-of-bounds (we keep emitting rally reset, but scoring for OOB is disabled per your request)
    const x = this.ball.node.x;
    const w = this.scale.width;
    if (this.ball.state === 'live' && (x < -10 || x > w + 10)) {
      // If you later want OOB to score or end the round, handle it here.
      this.ball.resetToCenter();
      this.rallyCount = 0;
      this.bus.emit('rally:changed', { rally: this.rallyCount });
      this.prevBallX = this.ball.node.x;
    }
  }
}
