document.addEventListener("DOMContentLoaded", () => {
  const lobbyTitle = document.getElementById("lobby-title");
  const lobbyPlayerList = document.getElementById("lobby-player-list");
  const startGameBtn = document.getElementById("start-game-btn");
  const joinForm = document.getElementById("join-form");
  const playerNameInput = document.getElementById("player-name-input");
  const joinBtn = document.getElementById("join-btn");

  // === Lokale Spieler-Identität ===
  const LOCAL_PLAYER_KEY = "falscheWahrheitPlayer";
  function setLocalPlayerIdentity(player) {
    sessionStorage.setItem(LOCAL_PLAYER_KEY, JSON.stringify(player));
  }
  function getLocalPlayerIdentity() {
    const playerJSON = sessionStorage.getItem(LOCAL_PLAYER_KEY);
    return playerJSON ? JSON.parse(playerJSON) : null;
  }
  // =============================================================

  const roomCode = getRoomCodeFromURL();
  if (!roomCode) {
    window.location.href = "index.html";
    return;
  }

  const gameRef = getGameRef(roomCode);
  lobbyTitle.textContent = `Lobby (${roomCode})`;

  let localGameState = null;

  gameRef.on("value", (snapshot) => {
    const gameStateFromFirebase = snapshot.val();

    if (!gameStateFromFirebase) {
      console.log(`Raum ${roomCode} wird initialisiert.`);
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
    console.log("Spielzustand empfangen:", localGameState);

    if (localGameState.currentPhase !== "LOBBY") {
      window.location.href = `game.html?room=${roomCode}`;
      return;
    }

    updateLobbyView(localGameState);
  });

  function updateLobbyView(state) {
    // Diese Funktion kümmert sich jetzt NUR um die Anzeige der Spieler
    // und die Logik für den Start-Button. Das Ausblenden des Formulars wird separat gehandhabt.
    lobbyPlayerList.innerHTML = "";
    if (state.players) {
      state.players.forEach((player) => {
        const playerEl = document.createElement("div");
        playerEl.className = "lobby-player";
        let playerText = player.name;
        if (player.id === state.hostId) {
          playerText += " 👑";
        }
        playerEl.textContent = playerText;
        lobbyPlayerList.appendChild(playerEl);
      });
    }

    // Aktualisiere die UI basierend darauf, ob der aktuelle Browser-Client schon beigetreten ist
    checkIfPlayerHasJoined(state);
  }

  // NEUE, dedizierte Funktion, um die UI für den Beitritt zu steuern
  function checkIfPlayerHasJoined(state) {
    const localPlayer = getLocalPlayerIdentity();

    // Ist der Spieler im sessionStorage für diesen Raum registriert UND in der DB vorhanden?
    const hasJoined =
      localPlayer &&
      localPlayer.roomCode === roomCode &&
      state.players.some((p) => p.id === localPlayer.playerId);

    if (hasJoined) {
      // Spieler ist beigetreten: Formular ausblenden
      joinForm.innerHTML = `<p>Du bist als <strong>${localPlayer.playerName}</strong> beigetreten. Warten auf Spielstart...</p>`;
      joinForm.style.marginBottom = "20px";

      // Start-Button-Logik: Nur für den Host anzeigen
      const amITheHost = localPlayer.playerId === state.hostId;
      const enoughPlayers = state.players && state.players.length >= 4;

      if (amITheHost) {
        startGameBtn.style.display = "block";
        startGameBtn.disabled = !enoughPlayers;
        startGameBtn.title = enoughPlayers
          ? ""
          : "Es werden mindestens 4 Spieler benötigt.";
      } else {
        startGameBtn.style.display = "none";
      }
    } else {
      // Spieler ist noch nicht beigetreten: Formular anzeigen, Button verstecken
      joinForm.style.display = "block";
      startGameBtn.style.display = "none";
    }
  }

  function joinLobby() {
    const name = playerNameInput.value.trim();
    if (!name) {
      alert("Bitte gib einen Namen ein.");
      return;
    }

    if (!localGameState) {
      alert("Verbindung wird hergestellt, bitte versuche es erneut.");
      return;
    }

    if (
      localGameState.players &&
      localGameState.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert(`Der Name "${name}" ist bereits vergeben.`);
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

    // Speichere die Identität des Spielers LOKAL, BEVOR wir an Firebase senden
    setLocalPlayerIdentity({
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      roomCode: roomCode,
    });

    // Sende den aktualisierten Zustand an Firebase
    saveGameState(roomCode, localGameState);
  }

  function startGame() {
    const localPlayer = getLocalPlayerIdentity();
    if (!localPlayer || localPlayer.playerId !== localGameState.hostId) return;

    const judgeIndex = Math.floor(
      Math.random() * localGameState.players.length
    );
    localGameState.judgeId = localGameState.players[judgeIndex].id;
    localGameState.players[judgeIndex].isJudge = true;
    localGameState.currentRound = 1;
    localGameState.currentPhase = "QUESTION_SELECTION";
    saveGameState(roomCode, localGameState);
  }

  // Initialer Check beim Laden der Seite
  if (localGameState) {
    checkIfPlayerHasJoined(localGameState);
  }

  joinBtn.addEventListener("click", joinLobby);
  playerNameInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") joinLobby();
  });
  startGameBtn.addEventListener("click", startGame);
});
