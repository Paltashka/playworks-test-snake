export class Food {
  constructor({ cols, rows, cellSize } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.position = null;
  }

  spawn(occupied = new Set()) {
    const max = this.cols * this.rows;
    if (occupied.size >= max) {
      this.position = null;
      return;
    }

    let tries = 0;
    while (tries < max) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        this.position = { x, y };
        return;
      }
      tries += 1;
    }
  }

  render(ctx) {
    if (!ctx || !this.position) {
      return;
    }

    ctx.fillStyle = "#f97316";
    ctx.fillRect(
      this.position.x * this.cellSize,
      this.position.y * this.cellSize,
      this.cellSize,
      this.cellSize,
    );
  }
}
