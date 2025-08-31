// /src/objects/Paddle.js
import Phaser from 'phaser';

export default class Paddle {
  /**
   * side: 'left' | 'right'
   */
  constructor(scene, x, y, side = 'left') {
    this.scene = scene;
    this.side = side;

    // visual
    this.node = scene.add.rectangle(x, y, 12, 90, 0xffffff).setOrigin(0.5);
    // physics
    scene.physics.add.existing(this.node, false); // dynamic body (we'll keep it immovable)
    this.body = /** @type {Phaser.Physics.Arcade.Body} */ (this.node.body);
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    this.speed = 420;
  }

  setY(y) {
    const h = this.scene.scale.height;
    // clamp to screen
    this.node.y = Phaser.Math.Clamp(y, this.node.height / 2, h - this.node.height / 2);
    this.body.updateFromGameObject();
  }

  move(dir, dt) {
    // dir: -1 up, +1 down, 0 stop
    const delta = dir * this.speed * dt;
    this.setY(this.node.y + delta);
  }

  follow(targetY, dt, maxCatchup = 0.85) {
    const desired = Phaser.Math.Linear(this.node.y, targetY, Phaser.Math.Clamp(maxCatchup * dt * 60, 0, 1));
    this.setY(desired);
  }
}
