// /src/objects/blocks/Block.js
import Phaser from 'phaser';

export default class Block {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {{ width:number, height:number, hp?:number, owner?:'player'|'enemy', color?:number, bus?:any }} opts
   */
  constructor(scene, x, y, opts) {
    this.scene = scene;
    this.w = opts.width;
    this.h = opts.height;
    this.hp = opts.hp ?? 3;
    this.owner = opts.owner ?? 'player';
    this.bus = opts.bus ?? null;
    this.alive = true;

    const fill = opts.color ?? (this.owner === 'player' ? 0x6ee7ff : 0xffc46e);

    this.node = scene.add.rectangle(x, y, this.w, this.h, fill).setOrigin(0.5);
    scene.physics.add.existing(this.node, false);
    this.body = /** @type {Phaser.Physics.Arcade.Body} */ (this.node.body);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setBounce(1, 1);
  }

  onBallHit(ball) {
    if (!this.alive) return;

    // outward nudge
    const v = new Phaser.Math.Vector2(ball.body.velocity.x, ball.body.velocity.y);
    const dx = Math.sign(ball.node.x - this.node.x) || 1;
    const minX = 120;
    v.x = dx * Math.max(Math.abs(v.x), minX);
    ball.body.setVelocity(v.x, v.y);

    // score: block hit
    if (this.bus) this.bus.emit('block:hit', { owner: this.owner });

    this.takeDamage(1);
    this.flash();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.destroy();
  }

  flash() {
    this.node.setFillStyle(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.alive) {
        this.node.setFillStyle(this.owner === 'player' ? 0x6ee7ff : 0xffc46e);
      }
    });
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.body.enable = false;
    this.node.destroy();
    // score: block destroyed
    if (this.bus) this.bus.emit('block:destroyed', { owner: this.owner });
  }
}
