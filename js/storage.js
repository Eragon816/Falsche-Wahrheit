const GAME_STATE_KEY = "falscheWahrheitState";

function getGameState() {
  const stateJSON = sessionStorage.getItem(GAME_STATE_KEY);
  return stateJSON ? JSON.parse(stateJSON) : null;
}

function saveGameState(state) {
  sessionStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
}

function clearGameState() {
  sessionStorage.removeItem(GAME_STATE_KEY);
}
