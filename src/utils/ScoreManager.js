// /src/utils/ScoreManager.js
// Listens to bus events and updates scores; emits 'score:changed' for the HUD.

export default class ScoreManager {
  /**
   * @param {import('./EventBus').default} bus
   */
  constructor(bus) {
    this.bus = bus;
    this.playerScore = 0;
    this.enemyScore = 0;
    this.rally = 0;

    // events from gameplay
    bus.on('block:hit',        this.onBlockHit,        this);
    bus.on('block:destroyed',  this.onBlockDestroyed,  this);
    bus.on('ball:out',         this.onBallOut,         this);
    bus.on('rally:changed',    this.onRallyChanged,    this);
  }

  award(to, pts) {
    if (to === 'player') this.playerScore += pts;
    else if (to === 'enemy') this.enemyScore += pts;
    this.emitUpdate();
  }

  onBlockHit({ owner }) {
    // Hitting ENEMY block awards the opposite side (attacker).
    // owner is the side that OWNS the block that got hit.
    if (owner === 'enemy') this.award('player', 1);
    else if (owner === 'player') this.award('enemy', 1);
  }

  onBlockDestroyed({ owner }) {
    if (owner === 'enemy') this.award('player', 3);
    else if (owner === 'player') this.award('enemy', 3);
  }

  onBallOut({ side }) {
    // side is which wall it went past: 'left' => player missed; enemy scores.
    if (side === 'left') this.award('enemy', 1);
    else if (side === 'right') this.award('player', 1);
  }

  onRallyChanged({ rally }) {
    this.rally = rally;
    this.emitUpdate();
  }

  emitUpdate() {
    this.bus.emit('score:changed', {
      player: this.playerScore,
      enemy: this.enemyScore,
      rally: this.rally,
    });
  }
}
