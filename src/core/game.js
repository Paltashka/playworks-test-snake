import { CanvasManager } from "./CanvasManager.js";

export const GAME_STATES = Object.freeze({
  BOOT: "BOOT",
  MENU: "MENU",
  AD_PLAYING: "AD_PLAYING",
  GAME: "GAME",
  GAMEOVER: "GAMEOVER",
});

export class Game {
  constructor({ canvasManager, canvas, adDurationMs = 3000 } = {}) {
    this.canvasManager =
      canvasManager || new CanvasManager({ canvas, canvasId: "game-canvas" });
    this.canvas = this.canvasManager ? this.canvasManager.canvas : null;
    this.ctx = this.canvasManager ? this.canvasManager.ctx : null;

    this.state = GAME_STATES.BOOT;
    this.prevTimestamp = 0;
    this.rafId = null;
    this.timeInStateMs = 0;
    this.adDurationMs = adDurationMs;

    this.pendingStart = false;
    this.pendingAd = false;
    this.pendingGameOver = false;
    this.pendingRestart = false;

    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.rafId === null) {
      return;
    }
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.prevTimestamp = 0;
  }

  requestStart({ playAd = false } = {}) {
    this.pendingStart = true;
    this.pendingAd = playAd;
  }

  requestGameOver() {
    this.pendingGameOver = true;
  }

  requestRestart() {
    this.pendingRestart = true;
  }

  setState(nextState) {
    if (nextState === this.state) {
      return;
    }
    this.state = nextState;
    this.timeInStateMs = 0;
  }

  loop(timestamp) {
    if (!this.prevTimestamp) {
      this.prevTimestamp = timestamp;
    }
    const deltaMs = timestamp - this.prevTimestamp;
    this.prevTimestamp = timestamp;
    this.timeInStateMs += deltaMs;

    this.update(deltaMs);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  }

  update(deltaMs) {
    switch (this.state) {
      case GAME_STATES.BOOT:
        this.setState(GAME_STATES.MENU);
        break;
      case GAME_STATES.MENU:
        if (this.pendingStart) {
          this.pendingStart = false;
          if (this.pendingAd) {
            this.pendingAd = false;
            this.setState(GAME_STATES.AD_PLAYING);
          } else {
            this.setState(GAME_STATES.GAME);
          }
        }
        break;
      case GAME_STATES.AD_PLAYING:
        if (this.timeInStateMs >= this.adDurationMs) {
          this.setState(GAME_STATES.GAME);
        }
        break;
      case GAME_STATES.GAME:
        if (this.pendingGameOver) {
          this.pendingGameOver = false;
          this.setState(GAME_STATES.GAMEOVER);
        }
        break;
      case GAME_STATES.GAMEOVER:
        if (this.pendingRestart) {
          this.pendingRestart = false;
          this.setState(GAME_STATES.MENU);
        }
        break;
      default:
        this.setState(GAME_STATES.BOOT);
        break;
    }
  }

  render() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    if (this.canvasManager) {
      this.canvasManager.clear();
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.fillStyle = "#0f172a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#e2e8f0";
    this.ctx.font = "24px system-ui";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      this.state,
      this.canvas.width / 2,
      this.canvas.height / 2,
    );
  }
}

export function initGame(options = {}) {
  const game = new Game(options);
  game.start();
  return game;
}
