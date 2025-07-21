document.addEventListener("DOMContentLoaded", () => {
  const lobbyTitle = document.getElementById("lobby-title");
  const lobbyPlayerList = document.getElementById("lobby-player-list");
  const startGameBtn = document.getElementById("start-game-btn");
  const joinForm = document.getElementById("join-form");
  const playerNameInput = document.getElementById("player-name-input");
  const joinBtn = document.getElementById("join-btn");

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
      console.log(`Room ${roomCode} does not exist. Initializing...`);
      const initialState = {
        roomCode: roomCode,
        players: [],
        hostId: null,
        currentPhase: "LOBBY",
      };
      saveGameState(roomCode, initialState);
      return;
    }

    localGameState = gameStateFromFirebase;
    console.log("Game state received:", localGameState);

    if (localGameState.currentPhase !== "LOBBY") {
      window.location.href = `game.html?room=${roomCode}`;
      return;
    }

    updateLobbyView(localGameState);
  });

  function updateLobbyView(state) {
    const localPlayer = getLocalPlayerIdentity();
    if (
      localPlayer &&
      localPlayer.roomCode === roomCode &&
      state.players.some((p) => p.id === localPlayer.playerId)
    ) {
      joinForm.innerHTML = `<p>You have joined as <strong>${localPlayer.playerName}</strong>. Waiting for the game to start...</p>`;
      joinForm.style.marginBottom = "20px";
    }

    lobbyPlayerList.innerHTML = "";
    const amITheHost = localPlayer && localPlayer.playerId === state.hostId;

    if (state.players) {
      state.players.forEach((player) => {
        const playerEl = document.createElement("div");
        playerEl.className = "lobby-player";

        let playerText = `<span>${player.name}</span>`; // Name in ein span wickeln
        if (player.id === state.hostId) {
          playerText += ' <span class="host-crown">👑</span>';
        }

        // NEU: Kick-Button hinzufügen, wenn ich der Host bin und es nicht ich selbst bin
        if (amITheHost && player.id !== localPlayer.playerId) {
          playerText += `<button class="kick-btn" data-kick-id="${player.id}">×</button>`;
        }

        playerEl.innerHTML = playerText;
        lobbyPlayerList.appendChild(playerEl);
      });
    }

    // Event-Listener für alle neuen Kick-Buttons hinzufügen
    addKickListeners();

    const enoughPlayers = state.players && state.players.length >= 4;
    if (amITheHost) {
      startGameBtn.style.display = "block";
      startGameBtn.disabled = !enoughPlayers;
      startGameBtn.title = enoughPlayers
        ? ""
        : "At least 4 players are required.";
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
      alert("Connecting to the server, please try again in a moment.");
      return;
    }
    if (
      localGameState.players &&
      localGameState.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert(`The name "${name}" is already taken. Please choose another one.`);
      return;
    }
    const newPlayer = {
      id: Date.now(),
      name: name,
      isJudge: false,
      isEliminated: false,
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

  // KORRIGIERTE startGame FUNKTION
  function startGame() {
    const localPlayer = getLocalPlayerIdentity();
    if (!localPlayer || localPlayer.playerId !== localGameState.hostId) {
      console.warn("Only the host can start the game!");
      return;
    }

    const judgeIndex = Math.floor(
      Math.random() * localGameState.players.length
    );
    localGameState.judgeId = localGameState.players[judgeIndex].id;
    localGameState.players[judgeIndex].isJudge = true;

    localGameState.currentRound = 1;
    localGameState.currentPhase = "QUESTION_SELECTION";

    // Alle runden-spezifischen Daten initialisieren
    localGameState.currentQuestion = "";
    localGameState.answers = [];
    localGameState.usedAnswers = [];
    localGameState.currentDefenderId = null;
    localGameState.currentAnswerToDefend = null;
    localGameState.defendedPlayerIdsInRound = [];

    saveGameState(roomCode, localGameState);
  }

  // NEUE FUNKTIONEN für das Kicken
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
      // Optional: Wenn der gekickte Spieler der Host war, einen neuen Host bestimmen
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
