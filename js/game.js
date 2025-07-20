document.addEventListener("DOMContentLoaded", () => {
  console.log("game.js: Skript geladen.");

  // === Lokale Spieler-Identität holen ===
  const LOCAL_PLAYER_KEY = "falscheWahrheitPlayer";
  function getLocalPlayerIdentity() {
    const playerJSON = sessionStorage.getItem(LOCAL_PLAYER_KEY);
    return playerJSON ? JSON.parse(playerJSON) : null;
  }
  const localPlayer = getLocalPlayerIdentity();
  console.log("game.js: Lokaler Spieler aus sessionStorage:", localPlayer);

  const roomCode = getRoomCodeFromURL();
  console.log("game.js: Raumcode aus URL:", roomCode);

  // === SICHERHEITSCHECKS ===
  if (!roomCode) {
    alert("FEHLER: Kein Raumcode gefunden. Zurück zur Startseite.");
    window.location.href = "index.html";
    return;
  }
  if (!localPlayer || localPlayer.roomCode !== roomCode) {
    alert(
      "FEHLER: Spieler-Identität nicht gefunden oder ungültig für diesen Raum. Zurück zur Startseite."
    );
    window.location.href = "index.html";
    return;
  }
  // ========================

  const gameRef = getGameRef(roomCode);
  let localGameState = {};

  console.log("game.js: Warte auf Daten von Firebase...");
  gameRef.on("value", (snapshot) => {
    console.log("game.js: Firebase-Daten empfangen!");
    const gameState = snapshot.val();
    if (!gameState) {
      console.error(
        "game.js: Spielzustand in Firebase ist null. Spiel könnte beendet sein."
      );
      alert("Das Spiel wurde beendet oder existiert nicht mehr.");
      window.location.href = "index.html";
      return;
    }

    localGameState = gameState;
    console.log("game.js: Aktueller Spielzustand:", localGameState);

    if (localGameState.currentPhase === "END") {
      console.log("game.js: Spiel ist zu Ende. Leite zu winner.html weiter.");
      window.location.href = `winner.html?room=${roomCode}`;
      return;
    }

    console.log("game.js: Rufe updateFullUI auf.");
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
    console.log("updateFullUI: Starte UI-Update.");
    updateGamePlayerList(state);
    renderPhaseUI(state);
    roundTitle.textContent = `Runde ${state.currentRound || 1}`;
    const judge = state.players.find((p) => p.id === state.judgeId);
    if (judge) {
      judgeNameEl.textContent = judge.name;
    } else {
      console.warn("updateFullUI: Richter nicht im Spieler-Array gefunden!");
    }
    console.log("updateFullUI: UI-Update abgeschlossen.");
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
    mainContent.innerHTML = "<!-- Inhalt wird neu gerendert -->"; // Leeren mit Kommentar für Debugging
    const amITheJudge = localPlayer.playerId === state.judgeId;
    console.log(
      `renderPhaseUI: Aktuelle Phase: ${state.currentPhase}, Bin ich Richter? ${amITheJudge}`
    );

    switch (state.currentPhase) {
      case "QUESTION_SELECTION":
        if (amITheJudge) {
          showQuestionSelection(state);
        } else {
          const judge = state.players.find((p) => p.id === state.judgeId);
          mainContent.innerHTML = `<h2>Warten...</h2><p>Der Richter, <strong>${
            judge ? judge.name : "Unbekannt"
          }</strong>, wählt gerade eine Frage aus.</p>`;
        }
        break;

      case "ANSWERING":
        showAnswerInput(state);
        break;

      case "DEFENDING":
        showDefenseTurn(state);
        break;

      case "JUDGING":
        if (amITheJudge) {
          showJudgingScreen(state);
        } else {
          const judge = state.players.find((p) => p.id === state.judgeId);
          mainContent.innerHTML = `<h2>Der Richter entscheidet...</h2><p><strong>${
            judge ? judge.name : "Unbekannt"
          }</strong> überlegt, wer die schwächste Verteidigung hatte.</p>`;
        }
        break;

      default:
        console.error(
          `renderPhaseUI: Unbekannte Phase "${state.currentPhase}"!`
        );
        mainContent.innerHTML = `<h2>Ein Fehler ist aufgetreten (Unbekannte Phase).</h2><p>Warte auf Synchronisation...</p>`;
        break;
    }
  }

  // Die restlichen Funktionen bleiben strukturell gleich wie in der letzten Antwort.
  // Ich füge sie hier der Vollständigkeit halber ein.

  function getActiveParticipants(state) {
    return state.players.filter((p) => !p.isJudge && !p.isEliminated);
  }

  function showQuestionSelection(state) {
    console.log("showQuestionSelection: Zeige UI für Richter.");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>Fragen-Auswahl (Du bist der Richter)</h2><p>Wähle eine Frage für diese Runde:</p><div class="question-selection-grid"></div>`;
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
    console.log("selectQuestion: Frage ausgewählt:", question);
    localGameState.currentQuestion = question;
    localGameState.currentPhase = "ANSWERING";
    localGameState.answers = [];
    saveGameState(roomCode, localGameState);
  }

  function showAnswerInput(state) {
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const participants = getActiveParticipants(state);
    const myAnswer = (state.answers || []).find(
      (a) => a.playerId === localPlayer.playerId
    );

    if (amITheJudge) {
      mainContent.innerHTML = `<h2>Warten auf Antworten</h2><p>Die Teilnehmer geben gerade ihre absurden Antworten ein.</p>`;
      return;
    }

    if (myAnswer) {
      mainContent.innerHTML = `<h2>Antwort abgegeben!</h2><p>Warte auf die anderen Spieler.</p>`;
      return;
    }

    mainContent.innerHTML = `<h2>Antwortphase</h2><p class="question-card">"${state.currentQuestion}"</p><p><strong>${localPlayer.playerName}</strong>, gib deine kreative, falsche Antwort ein:</p><textarea id="answer-input" placeholder="Deine absurde Antwort..."></textarea><button id="submit-answer-btn" class="btn">Antwort einreichen</button>`;
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
        if (localGameState.answers.length >= participants.length) {
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
    console.log(
      "distributeAnswers: Verteile Antworten und starte Verteidigungsphase."
    );
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
    }"</p><p>Jetzt ist <strong>${
      defender.name
    }</strong> an der Reihe, diese Antwort zu verteidigen:</p><div class="answer-to-defend">"${
      assigned.answer
    }"</div>${
      amIDefending
        ? `<button id="next-defense-btn" class="btn">Ich bin fertig, nächster!</button>`
        : `<p>Höre gut zu, was ${defender.name} zu sagen hat...</p>`
    }`;
    if (amIDefending) {
      document.getElementById("next-defense-btn").onclick = () => {
        localGameState.currentPlayerIndexForDefense =
          (localGameState.currentPlayerIndexForDefense || 0) + 1;
        saveGameState(roomCode, localGameState);
      };
    }
  }

  function showJudgingScreen(state) {
    mainContent.innerHTML = `<h2>Entscheidung (Du bist der Richter)</h2><p>Wessen Verteidigung war am wenigsten überzeugend? Wähle den Spieler, der ausscheiden soll.</p><div class="judgement-grid"></div>`;
    const grid = mainContent.querySelector(".judgement-grid");
    getActiveParticipants(state).forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "btn judgement-btn";
      btn.textContent = p.name;
      btn.onclick = () => eliminatePlayer(p.id);
      grid.appendChild(btn);
    });
  }

  function eliminatePlayer(playerId) {
    const player = localGameState.players.find((p) => p.id === playerId);
    player.isEliminated = true;
    if (getActiveParticipants(localGameState).length <= 1) {
      localGameState.winner = getActiveParticipants(localGameState)[0] || null;
      localGameState.currentPhase = "END";
    } else {
      localGameState.currentRound++;
      localGameState.currentPhase = "QUESTION_SELECTION";
    }
    saveGameState(roomCode, localGameState);
  }
});
