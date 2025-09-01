// /src/objects/Ball.js
import Phaser from 'phaser';

export default class Ball {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Phaser.Events.EventEmitter} bus - shared EventBus instance
   */
  constructor(scene, x, y, bus) {
    this.scene = scene;
    this.bus = bus;

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

    // Rally gating
    this._prevX = null;             // last x for midline crossing detection
    this._eligibleForRally = false; // becomes true only after a paddle hit

    // --- Spin (only from paddle vertical motion) ---
    // No edge/impact-based effects; spin is subtle and decays quickly.
    this.spinY = 0;
    this.spinDecay = 0.85;          // faster decay → shorter-lived spin
    this.maxSpinY = 60;             // cap per-frame spin influence
    this.spinFromPaddleVel = 0.10;  // LOWER spin from paddle movement

    this.resetToCenter();
    this.state = 'serve'; // 'serve' | 'live'
  }

  resetToCenter() {
    const { width, height } = this.scene.scale;
    this.node.setPosition(width / 2, height / 2);
    this.body.setVelocity(0, 0);
    this.state = 'serve';
    this.lastHitBy = null;

    // reset rally gating
    this._prevX = null;
    this._eligibleForRally = false;

    // clear spin
    this.spinY = 0;
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

    // Attribute the serve as a "hit" by the side serving, but do NOT
    // make it eligible for a rally award (prevents instant award on first cross).
    this.lastHitBy = direction === 'left' ? 'enemy' : 'player';
    this._eligibleForRally = false;

    // no spin on serve
    this.spinY = 0;
  }

  /**
   * Paddle contact handler:
   * - Sets rally eligibility
   * - Injects small *persistent* spin from paddle vertical velocity ONLY
   * - Does NOT change outgoing angle/speed (let physics handle the bounce uniformly)
   *
   * @param {'player'|'enemy'} side
   * @param {number} _impactOffset - ignored now (uniform paddle face)
   * @param {number} paddleVelY - paddle's vertical velocity (px/s) if available; else 0
   */
  onPaddleContact(side, _impactOffset = 0, paddleVelY = 0) {
    // Rally gating
    this.registerPaddleHit(side);

    // Persistent spin solely from paddle movement; no edge/impact effects.
    const spinImpulse = paddleVelY * this.spinFromPaddleVel;
    this.spinY = Phaser.Math.Clamp(this.spinY + spinImpulse, -this.maxSpinY, this.maxSpinY);

    // Do NOT alter current velocity here—uniform physics across paddle face.
    // Arcade Physics has already resolved the collision bounce.
  }

  /**
   * Legacy alias.
   * @param {'player'|'enemy'} side
   */
  registerPaddleHit(side) {
    this.lastHitBy = side;
    this._eligibleForRally = true; // next midline cross will award exactly once
  }

  /**
   * Reset rally gating explicitly (e.g., on score/serve reset).
   */
  resetRallyState() {
    this._eligibleForRally = false;
    this._prevX = null;
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

  /**
   * MUST be called once per frame from GameScene.update(time, delta).
   * - Applies spin (decaying) while preserving overall speed bucket.
   * - Detects midline crossing and emits rally event when eligible.
   */
  update(time, delta) {
    // --- Apply spin (vertical bias only), then decay ---
    if (Math.abs(this.spinY) > 0.01) {
      const v = new Phaser.Math.Vector2(this.body.velocity.x, this.body.velocity.y);
      const speed = Phaser.Math.Clamp(v.length(), this.baseSpeed, this.maxSpeed);

      // Apply capped spin for this frame
      v.y += Phaser.Math.Clamp(this.spinY, -this.maxSpinY, this.maxSpinY);

      // Re-normalize to preserve the speed bucket
      if (v.length() > 0) {
        v.setLength(speed);
        this.body.setVelocity(v.x, v.y);
      }

      // Faster decay per your request
      this.spinY *= this.spinDecay;
    }

    // --- Midline rally detection (unchanged) ---
    const xNow = this.node.x;

    // Initialize prevX on first tick after (re)serve/reset
    if (this._prevX === null) {
      this._prevX = xNow;
      return;
    }

    if (this._eligibleForRally && this.lastHitBy) {
      const centerX = this.scene.scale.width / 2;
      const x0 = this._prevX;
      const x1 = xNow;

      const crossedLR = x0 < centerX && x1 >= centerX;
      const crossedRL = x0 > centerX && x1 <= centerX;

      if ((crossedLR || crossedRL) && this.bus) {
        // Award condition met: (paddle hit) THEN (midline cross)
        this.bus.emit('rally:midline', { by: this.lastHitBy });
        this._eligibleForRally = false; // require a new paddle hit for another award
      }
    }

    this._prevX = xNow;
  }
}
