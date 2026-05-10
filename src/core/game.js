import { CanvasManager } from "./CanvasManager.js";
import { UIManager } from "./UIManager.js";
import { AdsManager } from "./AdsManager.js";
import { Snake, SNAKE_DIRECTIONS } from "../entities/snake.js";
import { Food } from "../entities/Food.js";
import {
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  GAME_BG_COLOR,
  GAME_GRID_COLOR,
  GAME_GRID_ALPHA,
  HUD_TEXT_COLOR,
  HUD_FONT,
  HUD_TITLE_FONT,
  HUD_PADDING,
  SNAKE_INITIAL_LENGTH,
} from "../utils/constants.js";
import { FEATURE_FLAGS } from "../utils/config.js";
import { defaultLogger } from "../utils/logger.js";
import { formatScore } from "../utils/strings.js";

export const GAME_STATES = Object.freeze({
  BOOT: "BOOT",
  MENU: "MENU",
  AD_PLAYING: "AD_PLAYING",
  GAME: "GAME",
  GAMEOVER: "GAMEOVER",
});

/**
 * Orchestrates game state, entities, and rendering.
 */
export class Game {
  /**
   * @param {object} [options]
   * @param {CanvasManager} [options.canvasManager]
   * @param {UIManager} [options.uiManager]
   * @param {AdsManager} [options.adsManager]
   * @param {HTMLCanvasElement} [options.canvas]
   * @param {object} [options.logger]
   * @param {(payload: { from: string, to: string }) => void} [options.onStateChange]
   * @param {(payload: { type: string, data?: object }) => void} [options.onEvent]
   * @param {(error: Error, context?: object) => void} [options.onError]
   */
  constructor({
    canvasManager,
    uiManager,
    adsManager,
    canvas,
    logger,
    onStateChange,
    onEvent,
    onError,
  } = {}) {
    this.canvasManager =
      canvasManager || new CanvasManager({ canvas, canvasId: "game-canvas" });
    this.canvas = this.canvasManager ? this.canvasManager.canvas : null;
    this.ctx = this.canvasManager ? this.canvasManager.ctx : null;
    this.uiManager =
      uiManager || new UIManager({ ctx: this.ctx, canvas: this.canvas });
    this.adsManager = adsManager || new AdsManager();
    this.logger = logger || defaultLogger;
    this.onStateChange = onStateChange || null;
    this.onEvent = onEvent || null;
    this.onError = onError || null;

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

  /**
   * @param {object} options
   * @param {object} [options.logger]
   * @param {(payload: { from: string, to: string }) => void} [options.onStateChange]
   * @param {(payload: { type: string, data?: object }) => void} [options.onEvent]
   * @param {(error: Error, context?: object) => void} [options.onError]
   */
  configure({ logger, onStateChange, onEvent, onError } = {}) {
    if (logger) this.logger = logger;
    if (onStateChange) this.onStateChange = onStateChange;
    if (onEvent) this.onEvent = onEvent;
    if (onError) this.onError = onError;
  }

  /**
   * Starts the requestAnimationFrame loop.
   */
  start() {
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * Stops the requestAnimationFrame loop.
   */
  stop() {
    if (this.rafId === null) {
      return;
    }
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.prevTimestamp = 0;
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.playAd]
   */
  requestStart({ playAd = false } = {}) {
    this.pendingStart = true;
    this.pendingAd = playAd;
    this.adTargetState = GAME_STATES.GAME;
  }

  /**
   * Queues a game over transition.
   */
  requestGameOver() {
    this.pendingGameOver = true;
  }

  /**
   * Queues a game restart.
   */
  requestRestart() {
    this.pendingRestart = true;
  }

  /**
   * @param {string} nextState
   */
  setState(nextState) {
    if (!Object.values(GAME_STATES).includes(nextState)) {
      this.logger.error("Unknown game state", nextState);
      this.emitError(new Error("Unknown game state"), { nextState });
      return;
    }

    if (nextState === this.state) {
      return;
    }
    const prevState = this.state;
    this.state = nextState;
    this.timeInStateMs = 0;

    if (FEATURE_FLAGS.enableTelemetry && this.onStateChange) {
      this.onStateChange({ from: prevState, to: nextState });
    }

    if (nextState === GAME_STATES.GAME && prevState !== GAME_STATES.GAME) {
      this.resetEntities();
    }
  }

  /**
   * @param {string} action
   * @param {string} phase
   */
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

  /**
   * Resets snake, food, and score.
   */
  resetEntities() {
    if (this.snake) {
      this.snake.reset();
    }
    if (this.food && this.snake) {
      this.food.spawn(this.snake.getOccupiedSet());
    }
    this.score = this.snake
      ? Math.max(0, this.snake.body.length - SNAKE_INITIAL_LENGTH)
      : 0;
  }

  /**
   * Primes the ad container inside a user gesture.
   * @returns {Promise<void>}
   */
  async prepareAdPlayback() {
    if (!this.adsManager) {
      return;
    }

    try {
      await this.adsManager.prime();
    } catch (error) {
      this.logger.warn("Ad prime failed", error);
      this.emitError(error, { phase: "prime" });
    }
  }

  /**
   * @param {number} timestamp
   */
  loop(timestamp) {
    if (!this.prevTimestamp) {
      this.prevTimestamp = timestamp;
    }
    const deltaMs = timestamp - this.prevTimestamp;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      this.logger.warn("Invalid delta time", deltaMs);
      this.prevTimestamp = timestamp;
      return;
    }
    this.prevTimestamp = timestamp;
    this.timeInStateMs += deltaMs;

    this.update(deltaMs);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * @param {number} deltaMs
   */
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
            .catch((error) => {
              this.logger.warn("Ad playback failed", error);
              this.emitError(error, { phase: "playAd" });
            })
            .then(() => {
              this.adPromise = null;
              this.setState(this.adTargetState);
            });
        }
        break;
      case GAME_STATES.GAME:
        if (this.snake && this.food) {
          try {
            const result = this.snake.update(deltaMs, this.food);
            if (result.ate) {
              this.food.spawn(this.snake.getOccupiedSet());
              this.score += 1;
              this.emitEvent("score", { score: this.score });
            }
            if (result.hit) {
              this.requestGameOver();
            }
          } catch (error) {
            this.logger.error("Snake update failed", error);
            this.emitError(error, { phase: "update" });
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

  /**
   * Draws the current frame.
   */
  render() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    if (this.canvasManager) {
      this.canvasManager.clear();
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.fillStyle = GAME_BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderGrid();

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

      this.ctx.fillStyle = HUD_TEXT_COLOR;
      this.ctx.font = HUD_FONT;
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(formatScore(this.score), HUD_PADDING, HUD_PADDING);
    }

    if (
      this.state !== GAME_STATES.MENU &&
      this.state !== GAME_STATES.GAMEOVER
    ) {
      this.ctx.fillStyle = HUD_TEXT_COLOR;
      this.ctx.font = HUD_TITLE_FONT;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        this.state,
        this.canvas.width / 2,
        this.canvas.height / 2,
      );
    }
  }

  /**
   * @param {string} type
   * @param {object} [data]
   */
  emitEvent(type, data) {
    if (FEATURE_FLAGS.enableTelemetry && this.onEvent) {
      this.onEvent({ type, data });
    }
  }

  /**
   * @param {Error} error
   * @param {object} [context]
   */
  emitError(error, context) {
    if (FEATURE_FLAGS.enableTelemetry && this.onError) {
      this.onError(error, context);
    }
  }

  /**
   * Draws the background grid.
   */
  renderGrid() {
    const { ctx, canvas, cellSize } = this;
    if (!ctx || !canvas) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = GAME_GRID_ALPHA;
    ctx.strokeStyle = GAME_GRID_COLOR;
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Creates and starts a new game instance.
 * @param {object} [options]
 * @returns {Game}
 */
export function initGame(options = {}) {
  const game = new Game(options);
  game.start();
  return game;
}
