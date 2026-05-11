export const UI_STRINGS = Object.freeze({
  menuTitle: "Want to play?",
  menuYes: "Yes (Enter)",
  menuNo: "No (Backspace)",
  gameOverTitle: "Play again?",
  scoreLabel: "Score",
  adFallbackTitle: "Ad unavailable",
  adFallbackBody: "Continuing the game...",
  adLoadingTitle: "Loading ad...",
  adWarningTitle: "Ad is about to start",
  adWarningBody: "Continuing in",
  adWarningSkip: "Skip wait (Backspace)",
});

export function formatScore(score) {
  return `${UI_STRINGS.scoreLabel}: ${score}`;
}
