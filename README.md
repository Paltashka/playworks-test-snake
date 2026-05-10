# PlayWorks Snake

A single‑page, canvas‑only Snake game built as a clean, test‑task friendly implementation. The project focuses on a grid‑based gameplay loop, a minimal state machine, and a lightweight ad overlay using Google IMA (test ads) without any UI DOM elements.

## Highlights

- Canvas‑only UI (dialogs and HUD rendered directly to the 2D context)
- Deterministic grid movement with delta‑time based stepping
- Clear game state flow: `BOOT` → `MENU` → `AD_PLAYING` → `GAME` → `GAMEOVER`
- Snake growth, food spawning, and collision detection
- Google IMA SDK integration with a promise‑based ad flow
- Clean, modular structure (core, entities, utils)

## Controls

- Arrow keys: move
- Enter: OK / confirm
- Backspace: Cancel (menu exit)

## Tech Stack

- Vanilla JavaScript (ES Modules)
- HTML5 Canvas (2D)
- Vite for dev server and production build
- Google IMA SDK (test video ads)

## Project Structure

- `src/core/` – game loop, state machine, input, UI, ads
- `src/entities/` – snake and food logic
- `src/utils/` – shared constants
- `src/style.css` – page and overlay styles

## Getting Started

```bash
npm install
npm run dev
```

Open the dev server URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Ads Note

Test ads are loaded via Google IMA. If the ad does not play, ensure your browser is not blocking the SDK or ads (Brave Shields / AdBlock). The game automatically continues if ads fail to load.

## Gameplay Flow

1. Menu dialog: “Do you want to play?”
2. On OK, an ad is shown on top of the canvas (test ad).
3. Game starts; score increases with each food eaten.
4. On collision, ad plays again, then a “Play again?” dialog is shown.
5. OK restarts the game.

## Why This Design

- **Predictable timing**: delta‑time stepping keeps movement stable across displays.
- **Separation of concerns**: entities, UI, input, and ad logic are isolated and readable.
- **Canvas‑only UI**: all dialogs and HUD are rendered on the canvas for strict compliance.

## Architecture Notes

- **State machine**: `Game` drives BOOT → MENU → AD_PLAYING → GAME → GAMEOVER.
- **Isolation**: ads, input, UI rendering, and entities live in separate modules to keep responsibilities small.
- **Config + logging**: feature flags and log levels are centralized, with verbose output in dev only.
- **Strings module**: UI text is centralized for easy localization and consistency.

## Edge Cases And Resilience

- **Ad failures**: timeouts and retries are handled; a fallback overlay is shown if ads cannot play.
- **Invalid timing**: non‑finite or negative delta times are ignored to keep the loop stable.
- **Runtime safety**: guards against missing canvas/context and ad elements.
- **Safe teardown**: ad manager cleanup is resilient to IMA exceptions.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview build

## License

This project is provided as a test‑task implementation. Replace or add a license if needed.
