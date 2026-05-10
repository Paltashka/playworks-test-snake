import { GAME_STATES } from "./game.js";

export class UIManager {
  constructor({ ctx, canvas } = {}) {
    this.ctx = ctx || null;
    this.canvas = canvas || null;
  }

  render(state) {
    if (!this.ctx || !this.canvas) {
      return;
    }

    if (state === GAME_STATES.MENU) {
      this.renderMenu();
    }
  }

  renderMenu() {
    const message = "Хочете грати?";
    const options = ["Так (Enter)", "Ні (Backspace)"];

    const width = Math.min(560, this.canvas.width * 0.8);
    const height = 220;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    this.drawDialog({ x, y, width, height, message, options });
  }

  drawDialog({ x, y, width, height, message, options = [] }) {
    this.ctx.save();

    this.ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    this.ctx.strokeStyle = "#38bdf8";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);

    this.ctx.fillStyle = "#e2e8f0";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.ctx.font = "600 28px system-ui";
    this.ctx.fillText(message, x + width / 2, y + height * 0.35);

    this.ctx.font = "20px system-ui";
    const optionY = y + height * 0.7;
    const gap = 140;

    if (options.length === 1) {
      this.ctx.fillText(options[0], x + width / 2, optionY);
    } else if (options.length >= 2) {
      this.ctx.fillText(options[0], x + width / 2 - gap, optionY);
      this.ctx.fillText(options[1], x + width / 2 + gap, optionY);
    }

    this.ctx.restore();
  }
}
