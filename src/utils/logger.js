import { FEATURE_FLAGS } from "./config.js";

const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

const DEFAULT_LEVEL = "info";

function normalizeLevel(level) {
  return LEVELS[level] ? level : DEFAULT_LEVEL;
}

export function createLogger({ level = DEFAULT_LEVEL } = {}) {
  const minLevel = LEVELS[normalizeLevel(level)];

  function canLog(levelKey) {
    return LEVELS[levelKey] >= minLevel;
  }

  return {
    debug(...args) {
      if (!FEATURE_FLAGS.enableDebugLogs || !canLog("debug")) return;
      console.debug("[snake]", ...args);
    },
    info(...args) {
      if (!canLog("info")) return;
      console.info("[snake]", ...args);
    },
    warn(...args) {
      if (!canLog("warn")) return;
      console.warn("[snake]", ...args);
    },
    error(...args) {
      if (!canLog("error")) return;
      console.error("[snake]", ...args);
    },
  };
}

export const defaultLogger = createLogger({ level: "info" });
