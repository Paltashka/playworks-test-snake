export const UI_STRINGS = Object.freeze({
  menuTitle: "Want to play?",
  menuYes: "Yes (Enter)",
  menuNo: "No (Backspace)",
  gameOverTitle: "Play again?",
  scoreLabel: "Score",
  adFallbackTitle: "Ad unavailable",
  adFallbackBody: "Continuing the game...",
  adLoadingTitle: "Loading ad...",
});

export function formatScore(score) {
  return `${UI_STRINGS.scoreLabel}: ${score}`;
}
