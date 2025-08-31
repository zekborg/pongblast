// /src/objects/Ball.js
import Phaser from 'phaser';

export default class Ball {
  constructor(scene, x, y) {
    this.scene = scene;

    // visual
    this.node = scene.add.circle(x, y, 8, 0xffffff).setOrigin(0.5);

    // physics
    scene.physics.add.existing(this.node, false); // dynamic
    this.body = /** @type {Phaser.Physics.Arcade.Body} */ (this.node.body);
    this.body.setCircle(8);
    this.body.setBounce(1, 1);
    this.body.setAllowGravity(false);

    // world bounds: collide only with top/bottom; sides are "out"
    scene.physics.world.setBoundsCollision(false, false, true, true);
    this.body.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;

    // speed settings
    this.baseSpeed = 260;
    this.speedRatchet = 24;  // per rally hit
    this.maxSpeed = 560;

    // attribution for rally scoring
    this.lastHitBy = null;   // 'player' | 'enemy' | null

    this.resetToCenter();
    this.state = 'serve'; // 'serve' | 'live'
  }

  resetToCenter() {
    const { width, height } = this.scene.scale;
    this.node.setPosition(width / 2, height / 2);
    this.body.setVelocity(0, 0);
    this.state = 'serve';
    this.lastHitBy = null;
  }

  /**
   * Serve the ball from center.
   * @param {'left'|'right'} direction - initial travel direction
   */
  serve(direction = 'left') {
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-30, 30));
    const speed = this.baseSpeed;
    const vx = (direction === 'left' ? -1 : 1) * Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.body.setVelocity(vx, vy);
    this.state = 'live';

    // Attribute the serve as a "hit" by the side serving.
    // If ball moves LEFT first, the RIGHT side initiated the serve (enemy on the right).
    // If ball moves RIGHT first, the LEFT side served (player on the left).
    this.lastHitBy = direction === 'left' ? 'enemy' : 'player';
  }

  ratchetSpeed() {
    const v = new Phaser.Math.Vector2(this.body.velocity.x, this.body.velocity.y);
    const next = Phaser.Math.Clamp(
      v.length() + this.speedRatchet,
      this.baseSpeed,
      this.maxSpeed
    );
    v.setLength(next);
    this.body.setVelocity(v.x, v.y);
  }
}
