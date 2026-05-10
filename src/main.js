import "./style.css";
import { CanvasManager } from "./core/CanvasManager.js";
import { AdsManager } from "./core/AdsManager.js";
import { initGame } from "./core/game.js";
import { InputHandler } from "./core/InputHandler.js";
import { FEATURE_FLAGS } from "./utils/config.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger({
  level: FEATURE_FLAGS.enableDebugLogs ? "debug" : "info",
});
const canvasManager = new CanvasManager();
const adsManager = new AdsManager({ logger });
const game = initGame({
  canvasManager,
  adsManager,
  logger,
  onStateChange: FEATURE_FLAGS.enableTelemetry
    ? ({ from, to }) => logger.debug("state", { from, to })
    : null,
  onEvent: FEATURE_FLAGS.enableTelemetry
    ? ({ type, data }) => logger.debug("event", { type, data })
    : null,
  onError: FEATURE_FLAGS.enableTelemetry
    ? (error, context) => logger.warn("game error", { error, context })
    : null,
});
const input = new InputHandler({
  game,
  onAction: ({ action, phase }) => game.handleInput(action, phase),
});
input.start();
