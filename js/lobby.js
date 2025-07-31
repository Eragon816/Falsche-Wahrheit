document.addEventListener("DOMContentLoaded", () => {
  const lobbyTitle = document.getElementById("lobby-title");
  const lobbyPlayerList = document.getElementById("lobby-player-list");
  const startGameBtn = document.getElementById("start-game-btn");
  const joinForm = document.getElementById("join-form");
  const playerNameInput = document.getElementById("player-name-input");
  const joinBtn = document.getElementById("join-btn");
  const readyContainer = document.getElementById("ready-container");

  const LOCAL_PLAYER_KEY = "falscheWahrheitPlayer";
  function setLocalPlayerIdentity(player) {
    sessionStorage.setItem(LOCAL_PLAYER_KEY, JSON.stringify(player));
  }
  function getLocalPlayerIdentity() {
    const playerJSON = sessionStorage.getItem(LOCAL_PLAYER_KEY);
    return playerJSON ? JSON.parse(playerJSON) : null;
  }

  const roomCode = getRoomCodeFromURL();
  if (!roomCode) {
    alert("Error: No room code found. Redirecting to start page.");
    window.location.href = "index.html";
    return;
  }

  const gameRef = getGameRef(roomCode);
  lobbyTitle.textContent = `Lobby (${roomCode})`;
  let localGameState = null;

  gameRef.on("value", (snapshot) => {
    const gameStateFromFirebase = snapshot.val();

    if (!gameStateFromFirebase) {
      const gameMode = sessionStorage.getItem("pendingGameMode") || "classic";
      sessionStorage.removeItem("pendingGameMode");
      const initialState = {
        roomCode: roomCode,
        gameMode: gameMode,
        players: [],
        hostId: null,
        currentPhase: "LOBBY",
      };
      saveGameState(roomCode, initialState);
      return;
    }

    localGameState = gameStateFromFirebase;
    if (!localGameState.gameMode) {
      localGameState.gameMode = "classic";
    }
    if (localGameState.currentPhase !== "LOBBY") {
      window.location.href = `game.html?room=${roomCode}`;
      return;
    }

    updateLobbyView(localGameState);
  });

  function updateLobbyView(state) {
    const localPlayer = getLocalPlayerIdentity();
    const amITheHost = localPlayer && localPlayer.playerId === state.hostId;
    const hasJoined =
      localPlayer &&
      localPlayer.roomCode === roomCode &&
      state.players.some((p) => p.id === localPlayer.playerId);

    if (hasJoined) {
      joinForm.style.display = "none";
    }

    // Render player list
    lobbyPlayerList.innerHTML = "";
    if (state.players) {
      state.players.forEach((player) => {
        const playerEl = document.createElement("div");
        playerEl.className = "lobby-player";

        // Add ready/not-ready classes for visual feedback
        if (player.isReady) {
          playerEl.classList.add("ready");
        } else if (player.id !== state.hostId) {
          playerEl.classList.add("not-ready");
        }

        let playerText = `<span class="ready-status-icon">${
          player.isReady ? "✅" : "❌"
        }</span><span>${player.name}</span>`;
        if (player.id === state.hostId) {
          // Host is always "ready" and has a crown
          playerText = `<span class="ready-status-icon">👑</span><span>${player.name}</span>`;
        }
        if (amITheHost && player.id !== localPlayer.playerId) {
          playerText += `<button class="kick-btn" data-kick-id="${player.id}">×</button>`;
        }

        playerEl.innerHTML = playerText;
        lobbyPlayerList.appendChild(playerEl);
      });
    }
    addKickListeners();

    // Render ready button for non-host players who have joined
    if (hasJoined && !amITheHost) {
      const myPlayerData = state.players.find(
        (p) => p.id === localPlayer.playerId
      );
      readyContainer.innerHTML = `<button id="ready-btn" class="btn ready-btn ${
        myPlayerData.isReady ? "is-ready" : ""
      }">${myPlayerData.isReady ? "I am NOT Ready" : "I am READY!"}</button>`;
      document.getElementById("ready-btn").onclick = toggleReadyState;
    } else {
      readyContainer.innerHTML = "";
    }

    // Logic for the host's start button
    const enoughPlayers = state.players && state.players.length >= 4;
    const allPlayersReady = state.players
      .filter((p) => p.id !== state.hostId)
      .every((p) => p.isReady);

    if (amITheHost) {
      startGameBtn.style.display = "block";
      startGameBtn.disabled = !enoughPlayers || !allPlayersReady;
      if (!enoughPlayers) {
        startGameBtn.title = "At least 4 players are required.";
      } else if (!allPlayersReady) {
        startGameBtn.title = "Waiting for all players to be ready...";
      } else {
        startGameBtn.title = "Everyone is ready! Let's go!";
      }
    } else {
      startGameBtn.style.display = "none";
    }
  }

  function joinLobby() {
    const name = playerNameInput.value.trim();
    if (!name) {
      alert("Please enter a name.");
      return;
    }
    if (!localGameState) {
      alert("Connecting to the server, please try again.");
      return;
    }
    if (
      localGameState.players &&
      localGameState.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert(`The name "${name}" is already taken.`);
      return;
    }

    // New players join as "not ready"
    const newPlayer = {
      id: Date.now(),
      name: name,
      isJudge: false,
      isEliminated: false,
      isReady: false,
    };
    if (!localGameState.players) localGameState.players = [];
    localGameState.players.push(newPlayer);
    if (!localGameState.hostId) {
      localGameState.hostId = newPlayer.id;
    }

    setLocalPlayerIdentity({
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      roomCode: roomCode,
    });
    saveGameState(roomCode, localGameState);
  }

  function toggleReadyState() {
    const localPlayer = getLocalPlayerIdentity();
    if (!localPlayer || !localGameState) return;

    const myPlayerIndex = localGameState.players.findIndex(
      (p) => p.id === localPlayer.playerId
    );
    if (myPlayerIndex > -1) {
      // Toggle the 'isReady' status
      localGameState.players[myPlayerIndex].isReady =
        !localGameState.players[myPlayerIndex].isReady;
      saveGameState(roomCode, localGameState);
    }
  }

  function startGame() {
    const localPlayer = getLocalPlayerIdentity();
    if (!localPlayer || localPlayer.playerId !== localGameState.hostId) {
      return;
    }

    const judgeIndex = Math.floor(
      Math.random() * localGameState.players.length
    );
    localGameState.judgeId = localGameState.players[judgeIndex].id;
    localGameState.players.forEach(
      (p) => (p.isJudge = p.id === localGameState.judgeId)
    );

    localGameState.currentRound = 1;
    localGameState.currentPhase = "QUESTION_SELECTION";
    localGameState.currentQuestion = "";
    localGameState.answers = [];
    localGameState.usedAnswers = [];
    localGameState.currentDefenderId = null;
    localGameState.currentAnswerToDefend = null;
    localGameState.defendedPlayerIdsInRound = [];

    saveGameState(roomCode, localGameState);
  }

  function addKickListeners() {
    document.querySelectorAll(".kick-btn").forEach((button) => {
      button.onclick = (e) => {
        const playerIdToKick = parseInt(e.target.dataset.kickId);
        kickPlayer(playerIdToKick);
      };
    });
  }

  function kickPlayer(playerId) {
    if (confirm(`Are you sure you want to kick this player?`)) {
      localGameState.players = localGameState.players.filter(
        (p) => p.id !== playerId
      );
      if (localGameState.hostId === playerId) {
        if (localGameState.players.length > 0) {
          localGameState.hostId = localGameState.players[0].id;
        } else {
          localGameState.hostId = null;
        }
      }
      saveGameState(roomCode, localGameState);
    }
  }

  joinBtn.addEventListener("click", joinLobby);
  playerNameInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") joinLobby();
  });
  startGameBtn.addEventListener("click", startGame);
});
