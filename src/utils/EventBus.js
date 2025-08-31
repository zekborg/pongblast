// /src/utils/EventBus.js
import Phaser from 'phaser';

// Simple shared event emitter for cross-scene/game systems.
export default class EventBus extends Phaser.Events.EventEmitter {}
