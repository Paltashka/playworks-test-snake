import "./style.css";
import { CanvasManager } from "./core/CanvasManager.js";
import { AdsManager } from "./core/AdsManager.js";
import { initGame } from "./core/game.js";
import { InputHandler } from "./core/InputHandler.js";

const canvasManager = new CanvasManager();
const adsManager = new AdsManager();
const game = initGame({ canvasManager, adsManager });
const input = new InputHandler({
  game,
  onAction: ({ action, phase }) => game.handleInput(action, phase),
});
input.start();
