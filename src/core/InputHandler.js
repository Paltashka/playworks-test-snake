import { GAME_STATES } from "./game.js";

const KEY_ACTIONS = Object.freeze({
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  Enter: "OK",
  Backspace: "CANCEL",
});

const DEFAULT_BINDINGS = Object.freeze({
  [GAME_STATES.BOOT]: new Set(),
  [GAME_STATES.MENU]: new Set(["OK"]),
  [GAME_STATES.AD_PLAYING]: new Set(["CANCEL"]),
  [GAME_STATES.GAME]: new Set(["UP", "DOWN", "LEFT", "RIGHT", "CANCEL"]),
  [GAME_STATES.GAMEOVER]: new Set(["OK", "CANCEL"]),
});

export class InputHandler {
  constructor({
    game,
    target = window,
    bindings = DEFAULT_BINDINGS,
    onAction,
  } = {}) {
    this.game = game;
    this.target = target;
    this.bindings = bindings;
    this.onAction = onAction;

    this.pressed = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  start() {
    if (!this.target) {
      return;
    }
    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
  }

  stop() {
    if (!this.target) {
      return;
    }
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
  }

  isPressed(action) {
    return this.pressed.has(action);
  }

  handleKeyDown(event) {
    const action = KEY_ACTIONS[event.key];
    if (!action) {
      return;
    }

    if (!this.isActionAllowed(action)) {
      return;
    }

    if (event.repeat && (action === "OK" || action === "CANCEL")) {
      return;
    }

    event.preventDefault();
    this.pressed.add(action);
    this.handleAction(action, "down");
  }

  handleKeyUp(event) {
    const action = KEY_ACTIONS[event.key];
    if (!action) {
      return;
    }

    this.pressed.delete(action);

    if (!this.isActionAllowed(action)) {
      return;
    }

    event.preventDefault();
    this.handleAction(action, "up");
  }

  isActionAllowed(action) {
    const state = this.game ? this.game.state : GAME_STATES.BOOT;
    const allowed = this.bindings[state];
    return Boolean(allowed && allowed.has(action));
  }

  handleAction(action, phase) {
    const state = this.game ? this.game.state : GAME_STATES.BOOT;

    if (this.onAction) {
      this.onAction({ action, phase, state });
    }

    if (!this.game || phase !== "down") {
      return;
    }

    if (state === GAME_STATES.MENU && action === "OK") {
      this.game.requestStart({ playAd: false });
      return;
    }

    if (state === GAME_STATES.GAMEOVER && action === "OK") {
      this.game.requestRestart();
    }
  }
}
