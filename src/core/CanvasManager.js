export class CanvasManager {
  constructor({ canvas, canvasId = "game-canvas", width, height } = {}) {
    this.canvas = canvas || document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    if (this.canvas && Number.isFinite(width)) {
      this.canvas.width = width;
    }
    if (this.canvas && Number.isFinite(height)) {
      this.canvas.height = height;
    }
  }

  clear() {
    if (!this.ctx || !this.canvas) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
