document.addEventListener("DOMContentLoaded", () => {
  const LOCAL_PLAYER_KEY = "falscheWahrheitPlayer";
  function getLocalPlayerIdentity() {
    const playerJSON = sessionStorage.getItem(LOCAL_PLAYER_KEY);
    return playerJSON ? JSON.parse(playerJSON) : null;
  }
  const localPlayer = getLocalPlayerIdentity();
  const roomCode = getRoomCodeFromURL();

  if (!roomCode || !localPlayer || localPlayer.roomCode !== roomCode) {
    alert(
      "FEHLER: Spieler-Identität oder Raumcode ungültig. Zurück zur Startseite."
    );
    window.location.href = "index.html";
    return;
  }

  const gameRef = getGameRef(roomCode);
  let localGameState = {};

  gameRef.on("value", (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
      alert("Das Spiel wurde beendet.");
      window.location.href = "index.html";
      return;
    }
    localGameState = gameState;
    if (localGameState.currentPhase === "END") {
      window.location.href = `winner.html?room=${roomCode}`;
      return;
    }
    updateFullUI(localGameState);
  });

  const mainContent = document.getElementById("main-content");
  const gamePlayerList = document.getElementById("game-player-list");
  const roundTitle = document.getElementById("round-title");
  const judgeNameEl = document.getElementById("judge-name");
  const sampleQuestions = [
    "Warum haben Pinguine keinen Führerschein?",
    "Warum ist der Himmel blau und nicht grün?",
    "Warum essen Katzen keine Gurken?",
    "Warum gibt es in Flugzeugen keine Fallschirme für Passagiere?",
    "Warum hat die Mona Lisa keine Augenbrauen?",
    "Warum gähnen wir, wenn wir müde sind?",
  ];

  function updateFullUI(state) {
    updateGamePlayerList(state);
    renderPhaseUI(state);
    roundTitle.textContent = `Runde ${state.currentRound || 1}`;
    const judge = state.players.find((p) => p.id === state.judgeId);
    if (judge) judgeNameEl.textContent = judge.name;
  }

  function updateGamePlayerList(state) {
    gamePlayerList.innerHTML = "";
    state.players.forEach((p) => {
      const playerEl = document.createElement("div");
      playerEl.className = "player-item";
      if (p.id === state.judgeId) playerEl.classList.add("judge");
      if (p.isEliminated) playerEl.classList.add("eliminated");
      let playerText = p.name;
      if (p.id === localPlayer.playerId) playerText += " (Du)";
      playerEl.textContent = playerText;
      gamePlayerList.appendChild(playerEl);
    });
  }

  function renderPhaseUI(state) {
    mainContent.innerHTML = "";
    const myPlayerData = state.players.find(
      (p) => p.id === localPlayer.playerId
    );
    if (myPlayerData && myPlayerData.isEliminated) {
      mainContent.innerHTML = `<h2>Du bist ausgeschieden!</h2><p>Du kannst jetzt den restlichen Runden als Zuschauer folgen.</p>`;
      return;
    }

    const amITheJudge = localPlayer.playerId === state.judgeId;
    switch (state.currentPhase) {
      case "QUESTION_SELECTION":
        if (amITheJudge) showQuestionSelection(state);
        else {
          const judge = state.players.find((p) => p.id === state.judgeId);
          mainContent.innerHTML = `<h2>Warten...</h2><p>Der Richter, <strong>${
            judge ? judge.name : ""
          }</strong>, wählt eine Frage.</p>`;
        }
        break;
      case "ANSWERING":
        showAnswerInput(state);
        break;
      case "DEFENDING":
        showDefenseTurn(state);
        break;
      case "JUDGING":
        if (amITheJudge) showJudgingScreen(state);
        else {
          const judge = state.players.find((p) => p.id === state.judgeId);
          mainContent.innerHTML = `<h2>Der Richter entscheidet...</h2><p><strong>${
            judge ? judge.name : ""
          }</strong> überlegt, wer rausfliegt.</p>`;
        }
        break;
      default:
        mainContent.innerHTML = `<h2>Ein Fehler ist aufgetreten.</h2>`;
        break;
    }
  }

  function getActiveParticipants(state) {
    return state.players.filter((p) => !p.isJudge && !p.isEliminated);
  }

  function showQuestionSelection(state) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>Fragen-Auswahl (Du bist Richter)</h2><p>Wähle eine Frage:</p><div class="question-selection-grid"></div>`;
    const grid = wrapper.querySelector(".question-selection-grid");
    const shuffled = sampleQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 4);
    selectedQuestions.forEach((q) => {
      const btn = document.createElement("button");
      btn.className = "question-btn";
      btn.textContent = q;
      btn.onclick = () => selectQuestion(q);
      grid.appendChild(btn);
    });
    mainContent.appendChild(wrapper);
  }

  function selectQuestion(question) {
    localGameState.currentQuestion = question;
    localGameState.currentPhase = "ANSWERING";
    saveGameState(roomCode, localGameState);
  }

  function showAnswerInput(state) {
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const myAnswer = (state.answers || []).find(
      (a) => a.playerId === localPlayer.playerId
    );

    if (amITheJudge) {
      mainContent.innerHTML = `<h2>Warten auf Antworten</h2><p>Die Teilnehmer geben ihre Antworten ein.</p>`;
      return;
    }
    if (myAnswer) {
      mainContent.innerHTML = `<h2>Antwort abgegeben!</h2><p>Warte auf die anderen Spieler.</p>`;
      return;
    }

    mainContent.innerHTML = `<h2>Antwortphase</h2><p class="question-card">"${state.currentQuestion}"</p><p><strong>${localPlayer.playerName}</strong>, gib deine falsche Antwort ein:</p><textarea id="answer-input"></textarea><button id="submit-answer-btn" class="btn">Einreichen</button>`;
    const input = document.getElementById("answer-input");
    const btn = document.getElementById("submit-answer-btn");
    input.focus();
    const submitFunc = () => {
      const answer = input.value.trim();
      if (answer) {
        if (!localGameState.answers) localGameState.answers = [];
        localGameState.answers.push({
          playerId: localPlayer.playerId,
          answer: answer,
        });
        if (
          localGameState.answers.length >=
          getActiveParticipants(localGameState).length
        ) {
          distributeAnswers();
        } else {
          saveGameState(roomCode, localGameState);
        }
      }
    };
    btn.onclick = submitFunc;
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitFunc();
      }
    };
  }

  function distributeAnswers() {
    const participants = getActiveParticipants(localGameState);
    let answersToDistribute = [...localGameState.answers];
    let shuffledAnswers = answersToDistribute.sort(() => Math.random() - 0.5);
    localGameState.assignedAnswers = participants.map((p, i) => {
      let answer = shuffledAnswers[i];
      if (shuffledAnswers.length > 1 && answer.playerId === p.id) {
        let nextI = (i + 1) % shuffledAnswers.length;
        [shuffledAnswers[i], shuffledAnswers[nextI]] = [
          shuffledAnswers[nextI],
          shuffledAnswers[i],
        ];
        answer = shuffledAnswers[i];
      }
      return {
        defenderId: p.id,
        answer: answer.answer,
        originalAuthorId: answer.playerId,
      };
    });
    localGameState.currentPhase = "DEFENDING";
    localGameState.currentPlayerIndexForDefense = 0;
    saveGameState(roomCode, localGameState);
  }

  function showDefenseTurn(state) {
    const defenseIndex = state.currentPlayerIndexForDefense || 0;
    if (
      !state.assignedAnswers ||
      defenseIndex >= state.assignedAnswers.length
    ) {
      localGameState.currentPhase = "JUDGING";
      saveGameState(roomCode, localGameState);
      return;
    }
    const assigned = state.assignedAnswers[defenseIndex];
    const defender = state.players.find((p) => p.id === assigned.defenderId);
    const amIDefending = localPlayer.playerId === defender.id;
    mainContent.innerHTML = `<h2>Verteidigungsphase</h2><p class="question-card">"${
      state.currentQuestion
    }"</p><p><strong>${
      defender.name
    }</strong> verteidigt:</p><div class="answer-to-defend">"${
      assigned.answer
    }"</div>${
      amIDefending
        ? `<button id="next-defense-btn" class="btn">Fertig, nächster!</button>`
        : `<p>Höre gut zu...</p>`
    }`;
    if (amIDefending) {
      document.getElementById("next-defense-btn").onclick = () => {
        localGameState.currentPlayerIndexForDefense++;
        saveGameState(roomCode, localGameState);
      };
    }
  }

  function showJudgingScreen(state) {
    mainContent.innerHTML = `<h2>Entscheidung (Du bist Richter)</h2><p>Wer war am wenigsten überzeugend?</p><div class="judgement-grid"></div>`;
    const grid = mainContent.querySelector(".judgement-grid");
    getActiveParticipants(state).forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "btn judgement-btn";
      btn.textContent = p.name;
      btn.onclick = () => eliminatePlayer(p.id);
      grid.appendChild(btn);
    });
  }

  // === NEUE, SAUBERE FUNKTION ZUM STARTEN EINER NEUEN RUNDE ===
  function startNewRound() {
    localGameState.currentRound++;
    localGameState.currentPhase = "QUESTION_SELECTION";

    // WICHTIG: Alte Rundendaten zurücksetzen!
    localGameState.currentQuestion = "";
    localGameState.answers = [];
    localGameState.assignedAnswers = [];
    localGameState.currentPlayerIndexForDefense = 0;

    saveGameState(roomCode, localGameState);
  }
  // ==========================================================

  function eliminatePlayer(playerId) {
    const player = localGameState.players.find((p) => p.id === playerId);
    if (player) {
      player.isEliminated = true;
    }

    if (getActiveParticipants(localGameState).length <= 1) {
      localGameState.winner = getActiveParticipants(localGameState)[0] || null;
      localGameState.currentPhase = "END";
      saveGameState(roomCode, localGameState);
    } else {
      // ALT: Wurde direkt hier gemacht. NEU: Rufen die saubere Funktion auf.
      startNewRound();
    }
  }
});
