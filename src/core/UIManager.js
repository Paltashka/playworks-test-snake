import { GAME_STATES } from "./game.js";
import {
  UI_DIALOG_BG,
  UI_DIALOG_STROKE,
  UI_TEXT_COLOR,
  UI_TITLE_FONT,
  UI_SUBTITLE_FONT,
  UI_OPTION_FONT,
  UI_DIALOG_WIDTH,
  UI_MENU_HEIGHT,
  UI_GAMEOVER_HEIGHT,
  UI_OPTION_GAP,
  UI_TITLE_Y_RATIO,
  UI_SUBTITLE_Y_RATIO,
  UI_OPTION_Y_RATIO,
} from "../utils/constants.js";

/**
 * Renders UI dialogs on the canvas.
 */
export class UIManager {
  /**
   * @param {object} [options]
   * @param {CanvasRenderingContext2D} [options.ctx]
   * @param {HTMLCanvasElement} [options.canvas]
   */
  constructor({ ctx, canvas } = {}) {
    this.ctx = ctx || null;
    this.canvas = canvas || null;
  }

  /**
   * @param {string} state
   * @param {object} [payload]
   * @param {number} [payload.score]
   */
  render(state, { score = 0 } = {}) {
    if (!this.ctx || !this.canvas) {
      return;
    }

    if (state === GAME_STATES.MENU) {
      this.renderMenu();
    }

    if (state === GAME_STATES.GAMEOVER) {
      this.renderGameOver(score);
    }
  }

  /**
   * Renders the main menu dialog.
   */
  renderMenu() {
    const message = "Хочете грати?";
    const options = ["Так (Enter)", "Ні (Backspace)"];

    const width = Math.min(UI_DIALOG_WIDTH, this.canvas.width * 0.8);
    const height = UI_MENU_HEIGHT;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    this.drawDialog({ x, y, width, height, message, options });
  }

  /**
   * @param {number} score
   */
  renderGameOver(score) {
    const message = "Грати знову?";
    const subtitle = `Очки: ${score}`;
    const options = ["Так (Enter)", "Ні (Backspace)"];

    const width = Math.min(UI_DIALOG_WIDTH, this.canvas.width * 0.8);
    const height = UI_GAMEOVER_HEIGHT;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    this.drawDialog({ x, y, width, height, message, options, subtitle });
  }

  /**
   * @param {object} options
   * @param {number} options.x
   * @param {number} options.y
   * @param {number} options.width
   * @param {number} options.height
   * @param {string} options.message
   * @param {string[]} [options.options]
   * @param {string} [options.subtitle]
   */
  drawDialog({ x, y, width, height, message, options = [], subtitle }) {
    this.ctx.save();

    this.ctx.fillStyle = UI_DIALOG_BG;
    this.ctx.strokeStyle = UI_DIALOG_STROKE;
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);

    this.ctx.fillStyle = UI_TEXT_COLOR;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.ctx.font = UI_TITLE_FONT;
    this.ctx.fillText(message, x + width / 2, y + height * UI_TITLE_Y_RATIO);

    if (subtitle) {
      this.ctx.font = UI_SUBTITLE_FONT;
      this.ctx.fillText(
        subtitle,
        x + width / 2,
        y + height * UI_SUBTITLE_Y_RATIO,
      );
    }

    this.ctx.font = UI_OPTION_FONT;
    const optionY = y + height * UI_OPTION_Y_RATIO;
    const gap = UI_OPTION_GAP;

    if (options.length === 1) {
      this.ctx.fillText(options[0], x + width / 2, optionY);
    } else if (options.length >= 2) {
      this.ctx.fillText(options[0], x + width / 2 - gap, optionY);
      this.ctx.fillText(options[1], x + width / 2 + gap, optionY);
    }

    this.ctx.restore();
  }
}
