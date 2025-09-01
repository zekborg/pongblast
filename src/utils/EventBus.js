// /src/utils/EventBus.js
import Phaser from 'phaser';

// Simple typed event bus that works everywhere we use `on`/`emit`.
export default class EventBus extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }
}
