import {
  SNAKE_COLOR,
  SNAKE_INITIAL_LENGTH,
  SNAKE_HEAD_COLOR,
  SNAKE_STROKE_COLOR,
  SNAKE_SPEED,
} from "../utils/constants.js";

export const SNAKE_DIRECTIONS = Object.freeze({
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
});

const OPPOSITE = new Map([
  [SNAKE_DIRECTIONS.UP, SNAKE_DIRECTIONS.DOWN],
  [SNAKE_DIRECTIONS.DOWN, SNAKE_DIRECTIONS.UP],
  [SNAKE_DIRECTIONS.LEFT, SNAKE_DIRECTIONS.RIGHT],
  [SNAKE_DIRECTIONS.RIGHT, SNAKE_DIRECTIONS.LEFT],
]);

export class Snake {
  /**
   * @param {object} options
   * @param {number} options.cols
   * @param {number} options.rows
   * @param {number} options.cellSize
   * @param {number} [options.speed]
   */
  constructor({ cols, rows, cellSize, speed = SNAKE_SPEED } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.speed = speed;
    this.stepMs = 1000 / this.speed;
    this.accumulator = 0;
    this.reset();
  }

  reset() {
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);
    this.body = [];
    for (let i = 0; i < SNAKE_INITIAL_LENGTH; i += 1) {
      this.body.push({ x: startX - i, y: startY });
    }
    this.direction = SNAKE_DIRECTIONS.RIGHT;
    this.nextDirection = this.direction;
    this.alive = true;
    this.accumulator = 0;
  }

  setDirection(direction) {
    if (!direction || direction === this.direction) {
      return;
    }
    if (OPPOSITE.get(this.direction) === direction) {
      return;
    }
    this.nextDirection = direction;
  }

  update(deltaMs, food) {
    if (!this.alive) {
      return { moved: false, ate: false, hit: true };
    }

    this.accumulator += deltaMs;
    let moved = false;
    let ate = false;

    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      this.direction = this.nextDirection;

      const head = this.body[0];
      const next = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };

      const willEat =
        food &&
        food.position &&
        next.x === food.position.x &&
        next.y === food.position.y;

      if (this.isOutOfBounds(next)) {
        this.alive = false;
        return { moved: true, ate: false, hit: true };
      }

      if (this.isOnBody(next, willEat)) {
        this.alive = false;
        return { moved: true, ate: false, hit: true };
      }

      this.body.unshift(next);
      if (willEat) {
        ate = true;
      } else {
        this.body.pop();
      }
      moved = true;
    }

    return { moved, ate, hit: false };
  }

  isOutOfBounds(position) {
    return (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= this.cols ||
      position.y >= this.rows
    );
  }

  isOnBody(position, willEat) {
    const limit = willEat ? this.body.length : this.body.length - 1;
    for (let i = 0; i < limit; i += 1) {
      const segment = this.body[i];
      if (segment.x === position.x && segment.y === position.y) {
        return true;
      }
    }
    return false;
  }

  getOccupiedSet() {
    return new Set(this.body.map((segment) => `${segment.x},${segment.y}`));
  }

  render(ctx) {
    if (!ctx) {
      return;
    }

    const inset = Math.max(1, Math.floor(this.cellSize * 0.08));
    ctx.fillStyle = SNAKE_COLOR;
    ctx.strokeStyle = SNAKE_STROKE_COLOR;
    ctx.lineWidth = 2;

    for (let i = 0; i < this.body.length; i += 1) {
      const segment = this.body[i];
      const x = segment.x * this.cellSize + inset;
      const y = segment.y * this.cellSize + inset;
      const size = this.cellSize - inset * 2;

      ctx.fillStyle = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_COLOR;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);
    }
  }
}
