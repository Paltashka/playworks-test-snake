import "./style.css";
import { CanvasManager } from "./core/CanvasManager.js";
import { initGame } from "./core/game.js";
import { InputHandler } from "./core/InputHandler.js";

const canvasManager = new CanvasManager();
const game = initGame({ canvasManager });
const input = new InputHandler({ game });
input.start();
