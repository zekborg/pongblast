// /src/utils/ScoreManager.js
// Centralized scoring + rally tally.
// Listens on the shared bus and emits updates for the HUD.
//
// Inbound events handled:
//   - 'rally:midline'     { by: 'player'|'enemy' }   -> award(by, +1), rally += 1
//   - 'block:hit'         { owner, by }              -> award(by, +1)        (no rally change)
//   - 'block:destroyed'   { owner, by }              -> award(by, +3)        (no rally change)
//
// Outbound events emitted:
//   - 'score:changed'     { player, enemy }
//   - 'rally:changed'     { rally }

export default class ScoreManager {
  /**
   * @param {Phaser.Events.EventEmitter} bus
   */
  constructor(bus) {
    this.bus = bus;

    // Core totals
    this.player = 0;
    this.enemy = 0;

    // Rally tally (display-only aggregate of successful rally awards)
    this.rally = 0;

    // Wire listeners
    if (this.bus) {
      // Rally awards: paddle-hit → midline-cross
      this.bus.on('rally:midline', ({ by }) => {
        if (!by) return;
        this.award(by, 1);
        this.rally += 1;
        this.bus.emit('rally:changed', { rally: this.rally });
      });

      // Block scoring (from BlockGrid)
      // "by" = hitter (side who last hit the ball)
      this.bus.on('block:hit', ({ owner, by }) => {
        if (!by) return;
        this.award(by, 1);
      });

      this.bus.on('block:destroyed', ({ owner, by }) => {
        if (!by) return;
        this.award(by, 3);
      });

      // Emit initial state so HUD doesn't show undefined
      this.bus.emit('score:changed', { player: this.player, enemy: this.enemy });
      this.bus.emit('rally:changed', { rally: this.rally });
    }
  }

  /**
   * Award points to a side and notify UI.
   * @param {'player'|'enemy'} side
   * @param {number} amount
   */
  award(side, amount = 1) {
    if (side === 'player') this.player += amount;
    else if (side === 'enemy') this.enemy += amount;

    this.bus?.emit('score:changed', {
      player: this.player,
      enemy: this.enemy
    });
  }

  /** Reset only the rally tally (not the scores). */
  resetRally() {
    this.rally = 0;
    this.bus?.emit('rally:changed', { rally: this.rally });
  }

  /** Hard reset: scores + rally. */
  resetAll() {
    this.player = 0;
    this.enemy = 0;
    this.rally = 0;
    this.bus?.emit('score:changed', { player: this.player, enemy: this.enemy });
    this.bus?.emit('rally:changed', { rally: this.rally });
  }

  getTotals() {
    return {
      player: this.player,
      enemy: this.enemy,
      rally: this.rally
    };
  }
}
