import { CanvasManager } from "./CanvasManager.js";
import { UIManager } from "./UIManager.js";
import { AdsManager } from "./AdsManager.js";
import { Snake, SNAKE_DIRECTIONS } from "../entities/snake.js";
import { Food } from "../entities/Food.js";
import { GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from "../utils/constants.js";

export const GAME_STATES = Object.freeze({
  BOOT: "BOOT",
  MENU: "MENU",
  AD_PLAYING: "AD_PLAYING",
  GAME: "GAME",
  GAMEOVER: "GAMEOVER",
});

export class Game {
  constructor({ canvasManager, uiManager, adsManager, canvas } = {}) {
    this.canvasManager =
      canvasManager || new CanvasManager({ canvas, canvasId: "game-canvas" });
    this.canvas = this.canvasManager ? this.canvasManager.canvas : null;
    this.ctx = this.canvasManager ? this.canvasManager.ctx : null;
    this.uiManager =
      uiManager || new UIManager({ ctx: this.ctx, canvas: this.canvas });
    this.adsManager = adsManager || new AdsManager();

    this.state = GAME_STATES.BOOT;
    this.prevTimestamp = 0;
    this.rafId = null;
    this.timeInStateMs = 0;

    this.pendingStart = false;
    this.pendingAd = false;
    this.pendingGameOver = false;
    this.pendingRestart = false;

    this.cellSize = GRID_CELL_SIZE;
    this.cols = GRID_COLS;
    this.rows = GRID_ROWS;
    this.snake = new Snake({
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
    });
    this.food = new Food({
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
    });
    this.resetEntities();

    this.adPromise = null;
    this.adTargetState = GAME_STATES.GAME;

    this.score = 0;

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
    this.adTargetState = GAME_STATES.GAME;
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
    const prevState = this.state;
    this.state = nextState;
    this.timeInStateMs = 0;

    if (nextState === GAME_STATES.GAME && prevState !== GAME_STATES.GAME) {
      this.resetEntities();
    }
  }

  handleInput(action, phase) {
    if (phase !== "down" || this.state !== GAME_STATES.GAME) {
      return;
    }

    const directionMap = {
      UP: SNAKE_DIRECTIONS.UP,
      DOWN: SNAKE_DIRECTIONS.DOWN,
      LEFT: SNAKE_DIRECTIONS.LEFT,
      RIGHT: SNAKE_DIRECTIONS.RIGHT,
    };

    const direction = directionMap[action];
    if (direction) {
      this.snake.setDirection(direction);
    }
  }

  resetEntities() {
    if (this.snake) {
      this.snake.reset();
    }
    if (this.food && this.snake) {
      this.food.spawn(this.snake.getOccupiedSet());
    }
    this.score = this.snake ? Math.max(0, this.snake.body.length - 3) : 0;
  }

  async prepareAdPlayback() {
    if (!this.adsManager) {
      return;
    }

    try {
      await this.adsManager.prime();
    } catch (error) {
      // Ignore prime errors so the game can continue.
    }
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
        if (!this.adsManager) {
          this.setState(this.adTargetState);
          break;
        }

        if (!this.adPromise) {
          this.adPromise = this.adsManager
            .playAd({
              width: this.canvas ? this.canvas.width : undefined,
              height: this.canvas ? this.canvas.height : undefined,
            })
            .catch(() => {})
            .then(() => {
              this.adPromise = null;
              this.setState(this.adTargetState);
            });
        }
        break;
      case GAME_STATES.GAME:
        if (this.snake && this.food) {
          const result = this.snake.update(deltaMs, this.food);
          if (result.ate) {
            this.food.spawn(this.snake.getOccupiedSet());
            this.score += 1;
          }
          if (result.hit) {
            this.requestGameOver();
          }
        }
        if (this.pendingGameOver) {
          this.pendingGameOver = false;
          if (this.adsManager) {
            this.adTargetState = GAME_STATES.GAMEOVER;
            this.setState(GAME_STATES.AD_PLAYING);
          } else {
            this.setState(GAME_STATES.GAMEOVER);
          }
        }
        break;
      case GAME_STATES.GAMEOVER:
        if (this.pendingRestart) {
          this.pendingRestart = false;
          this.resetEntities();
          this.setState(GAME_STATES.GAME);
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

    if (this.uiManager) {
      this.uiManager.render(this.state, { score: this.score });
    }

    if (
      this.state === GAME_STATES.GAME ||
      this.state === GAME_STATES.GAMEOVER
    ) {
      if (this.food) {
        this.food.render(this.ctx);
      }
      if (this.snake) {
        this.snake.render(this.ctx);
      }

      this.ctx.fillStyle = "#e2e8f0";
      this.ctx.font = "18px system-ui";
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(`Очки: ${this.score}`, 16, 16);
    }

    if (this.state !== GAME_STATES.MENU && this.state !== GAME_STATES.GAMEOVER) {
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
}

export function initGame(options = {}) {
  const game = new Game(options);
  game.start();
  return game;
}
