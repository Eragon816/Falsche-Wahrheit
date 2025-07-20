document.addEventListener("DOMContentLoaded", () => {
  const winnerNameEl = document.getElementById("winner-name");
  const playAgainBtn = document.getElementById("play-again-btn");
  const roomCode = getRoomCodeFromURL();

  if (roomCode) {
    const gameRef = getGameRef(roomCode);
    gameRef.get().then((snapshot) => {
      if (snapshot.exists()) {
        const gameState = snapshot.val();
        if (gameState.winner) {
          winnerNameEl.textContent = gameState.winner.name;
        } else {
          winnerNameEl.textContent = "Niemand";
        }
      }
    });
  }

  playAgainBtn.addEventListener("click", () => {
    if (roomCode) {
      clearGameState(roomCode);
    }
    window.location.href = "index.html";
  });
});
