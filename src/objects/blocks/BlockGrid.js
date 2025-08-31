// /src/objects/blocks/BlockGrid.js
// 2D grid: cols × rows of rectangular blocks (e.g., 3 × 5 per side).
import Block from './Block.js';

export default class BlockGrid {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   cols:number, rows:number,
   *   cellW:number, cellH:number,
   *   originX:number, originY:number,
   *   owner:'player'|'enemy',
   *   gap?:number
   * }} cfg
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.cellW = cfg.cellW;
    this.cellH = cfg.cellH;
    this.originX = cfg.originX; // top-left of grid in world space
    this.originY = cfg.originY;
    this.owner = cfg.owner;
    this.gap = cfg.gap ?? 2;

    this.blocks = new Array(this.rows);
    for (let r = 0; r < this.rows; r++) this.blocks[r] = new Array(this.cols).fill(null);

    this.ball = null;
  }

  worldPos(col, row) {
    const x = this.originX + col * this.cellW + this.cellW / 2;
    const y = this.originY + row * this.cellH + this.cellH / 2;
    return { x, y };
  }

  addBlock(col, row, opts = {}) {
    const { x, y } = this.worldPos(col, row);
    const b = new Block(this.scene, x, y, {
      width: this.cellW - this.gap,
      height: this.cellH - this.gap,
      owner: this.owner,
      ...opts
    });
    this.blocks[row][col] = b;

    if (this.ball) {
      this.scene.physics.add.collider(this.ball.node, b.node, () => b.onBallHit(this.ball), null, this);
    }
    return b;
  }

  fillAll(opts = {}) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.addBlock(c, r, opts);
    }
  }

  bindBall(ball) {
    this.ball = ball;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.blocks[r][c];
        if (b) {
          this.scene.physics.add.collider(ball.node, b.node, () => b.onBallHit(ball), null, this);
        }
      }
    }
  }
}
