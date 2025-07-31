document.addEventListener("DOMContentLoaded", () => {
  const LOCAL_PLAYER_KEY = "falscheWahrheitPlayer";
  function getLocalPlayerIdentity() {
    const playerJSON = sessionStorage.getItem(LOCAL_PLAYER_KEY);
    return playerJSON ? JSON.parse(playerJSON) : null;
  }
  const localPlayer = getLocalPlayerIdentity();
  const roomCode = getRoomCodeFromURL();

  if (!roomCode || !localPlayer || localPlayer.roomCode !== roomCode) {
    window.location.href = "index.html";
    return;
  }

  const gameRef = getGameRef(roomCode);
  let localGameState = {};

  gameRef.on("value", (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
      alert("Game has ended.");
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
    "اوصفني بـ 3 كلمات؟",
    "ليش تركت انت والإكس تبعك؟",
    "انا بذكرك بمين؟",
    "اكتب بيت شعر من تأليفك يوصفني.",
    "حاجة مجنونة عملتها عشان توصل للي بتحبها؟ ",
    "لو نحن متخانقين، كيف رح تصالحني؟",
    "لما تروح تتقدم للبنت الي بتحبها، شو رح تاخذ معك؟",
    "مامتك ايش حكت لما شافت صورتي؟",
    "كيف شايف مستقبلك؟",
    "السبب اللي خلاك تختار خطيبتك؟",
    "لو انا انخطفت وطلبو فدية، شو اول شي رح تعمله؟",
    "ايش سبب اخر خناقة مع البست فريند؟",
    "لو كنت ماشي مع رفيقتك وواحد لطشها بالشارع، شو رح تعمل؟",
    "لو حبيبتك اتقدملها عريس تاني، شو رح تعمل؟",
    "اوصف ماضيك بـ 3 كلمات؟",
    "ايش اللي بيميزك عن باقي الشباب؟",
    "لو الإكس تبعك حكت معي، ايش تتوقع السبب؟",
    "قلدني بجملة.",
    "شغلة مجنونة عملتها عشان توصل للي بتحبها؟",
    "ايش حكتلك البست فريند عني؟",
    "لو انحبسنا بجزيرة مهجورة، شو الشغلة الوحيدة اللي رح تاخذها معك؟",
    "ايش مسجل اسم مرتك عالجوال؟",
    "طلبت منك تجيب شغلة تذكرك فيني، شو رح تجيب؟",
    "انت ليش سينجل هلأ؟",
    "لو وعدتني بوعد عمرك مارح ترجع فيه، شو رح يكون؟",
    "وحدة زميلتك بالشغل بعثتلك رسالة، شو مكتوب فيها؟",
    "لو رحت ديت مع وحدة ولاقيتها جايبة معها مامتها؟",
    "ايش اخر شغلة رح الاقيها بالسيرش بجوجل تبعك؟",
    "ايش الخبر يلي مكتوب عنك بالجرائد؟",
    "ايش اول انطباع اخذته عني؟",
  ];

  function updateFullUI(state) {
    updateGamePlayerList(state);
    renderPhaseUI(state);
    roundTitle.textContent = state.currentPhase.startsWith("FINAL_ROUND")
      ? "FINAL ROUND!"
      : `Round ${state.currentRound || 1}`;
    const judge = state.players.find((p) => p.id === state.judgeId);
    if (judge) judgeNameEl.textContent = judge.name;
  }

  function updateGamePlayerList(state) {
    const listContainer = document.getElementById("game-player-list");
    const existingPlayerElements = {};
    listContainer.querySelectorAll(".player-item").forEach((el) => {
      existingPlayerElements[el.id] = el;
    });
    const fragment = document.createDocumentFragment();
    state.players.forEach((p) => {
      const playerElId = `player-item-${p.id}`;
      const playerEl = document.createElement("div");
      playerEl.id = playerElId;
      playerEl.className = "player-item";
      if (p.id === state.judgeId) playerEl.classList.add("judge");
      if (p.id === state.currentDefenderId) playerEl.classList.add("defending");
      let playerText = p.name;
      if (p.id === localPlayer.playerId) playerText += " (You)";
      playerEl.textContent = playerText;
      if (p.isEliminated) {
        const oldElement = existingPlayerElements[playerElId];
        if (oldElement && !oldElement.classList.contains("is-eliminating")) {
          playerEl.classList.add("is-eliminating");
          fragment.appendChild(playerEl);
          setTimeout(() => {
            const elToRemove = document.getElementById(playerElId);
            if (elToRemove) elToRemove.remove();
          }, 600);
        }
      } else {
        fragment.appendChild(playerEl);
      }
    });
    listContainer.innerHTML = "";
    listContainer.appendChild(fragment);
  }

  function renderPhaseUI(state) {
    mainContent.innerHTML = "";
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const myPlayerData = state.players.find(
      (p) => p.id === localPlayer.playerId
    );
    if (
      myPlayerData &&
      myPlayerData.isEliminated &&
      !state.currentPhase.startsWith("FINAL_ROUND")
    ) {
      if (state.currentPhase === "ANSWERING") {
        showAnswerInput(state);
      } else {
        showWaitingScreen(
          "You have been eliminated!",
          "You can now watch the rest of the round. You can write answers in the next answering phase."
        );
      }
      return;
    }

    switch (state.currentPhase) {
      case "QUESTION_SELECTION":
        if (state.gameMode === "custom") {
          if (amITheJudge) showCustomQuestionInput(state);
          else
            showWaitingScreen(
              "Waiting for Question",
              "The Judge is writing a custom question for this round."
            );
        } else {
          if (amITheJudge) showQuestionSelection(state);
          else
            showWaitingScreen(
              "Waiting...",
              "The Judge is choosing a question."
            );
        }
        break;
      case "ANSWERING":
        showAnswerInput(state);
        break;
      case "DEFENDING":
        showDefensePhase(state);
        break;
      case "JUDGING":
        if (amITheJudge) showJudgingScreen(state);
        else
          showWaitingScreen(
            "The Judge is deciding...",
            "Who will be eliminated next?"
          );
        break;
      case "FINAL_ROUND_QUESTION":
        if (amITheJudge) showFinalQuestionInput(state);
        else
          showWaitingScreen(
            "The Final Question",
            "The Judge is writing the final, ultimate question!"
          );
        break;
      case "FINAL_ROUND_ANSWERING":
        showFinalRoundAnswering(state);
        break;
      case "FINAL_ROUND_DEFENSE":
        showFinalRoundDefense(state);
        break;
    }
  }

  function showWaitingScreen(title, text) {
    mainContent.innerHTML = `<div><h2>${title}</h2><p>${text}</p></div>`;
  }
  function getActiveDefenders(state) {
    return state.players.filter((p) => !p.isJudge && !p.isEliminated);
  }
  function getWriters(state) {
    return state.players.filter((p) => !p.isJudge);
  }

  function showQuestionSelection(state) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>Question Selection (Judge)</h2><p>Choose a question:</p><div class="question-selection-grid"></div>`;
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

  function showCustomQuestionInput() {
    mainContent.innerHTML = `<div>
            <h2>Custom Question (Judge)</h2>
            <p>Write your own question for the players to answer.</p>
            <textarea id="custom-question-input" placeholder="e.g., Why are cats secretly planning world domination?"></textarea>
            <button id="submit-custom-question" class="btn">Submit Question</button>
        </div>`;
    const input = document.getElementById("custom-question-input");
    input.focus();
    document.getElementById("submit-custom-question").onclick = () => {
      const question = input.value.trim();
      if (question) {
        selectQuestion(question);
      } else {
        alert("Please write a question.");
      }
    };
  }

  function selectQuestion(question) {
    localGameState.currentPhase = "ANSWERING";
    localGameState.currentQuestion = question;
    localGameState.answers = [];
    saveGameState(roomCode, localGameState);
  }

  function showAnswerInput(state) {
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const myAnswer = (state.answers || []).find(
      (a) => a.playerId === localPlayer.playerId
    );
    if (amITheJudge) {
      showWaitingScreen(
        "Waiting for Answers",
        "The players are writing their answers."
      );
      return;
    }
    if (myAnswer) {
      showWaitingScreen("Answer Submitted!", "Waiting for other players.");
      return;
    }
    mainContent.innerHTML = `<div><h2>Answering Phase</h2><p class="question-card">"${state.currentQuestion}"</p><p><strong>${localPlayer.playerName}</strong>, write your false answer:</p><textarea id="answer-input"></textarea><button id="submit-answer-btn" class="btn">Submit</button></div>`;
    const input = document.getElementById("answer-input");
    input.focus();
    document.getElementById("submit-answer-btn").onclick = () => {
      const answer = input.value.trim();
      if (answer) {
        if (!localGameState.answers) localGameState.answers = [];
        localGameState.answers.push({
          playerId: localPlayer.playerId,
          answer: answer,
        });
        if (
          localGameState.answers.length >= getWriters(localGameState).length
        ) {
          localGameState.currentPhase = "DEFENDING";
          saveGameState(roomCode, localGameState);
        } else {
          saveGameState(roomCode, localGameState);
        }
      }
    };
  }

  function showDefensePhase(state) {
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const defenderId = state.currentDefenderId;
    if (amITheJudge) {
      showDefenseControlForJudge(state);
    } else if (localPlayer.playerId === defenderId) {
      mainContent.innerHTML = `<div><h2>You are defending!</h2><p class="question-card">"${state.currentQuestion}"</p><p>Explain to the Judge why this answer is logical:</p><div class="answer-to-defend">"${state.currentAnswerToDefend}"</div></div>`;
    } else {
      const defender = state.players.find((p) => p.id === defenderId);
      if (defender) {
        showWaitingScreen(
          `${defender.name} is defending...`,
          "Listen carefully!"
        );
      } else {
        showWaitingScreen(
          "Defense Phase",
          "The Judge is choosing who defends next."
        );
      }
    }
  }

  function showDefenseControlForJudge(state) {
    let html = `<h2>Defense Phase (Judge)</h2>`;
    const defendedPlayerIds = state.defendedPlayerIdsInRound || [];
    const allDefenders = getActiveDefenders(state);
    const availableDefenders = allDefenders.filter(
      (p) => !defendedPlayerIds.includes(p.id)
    );
    if (state.currentDefenderId) {
      const defender = state.players.find(
        (p) => p.id === state.currentDefenderId
      );
      html += `<p><strong>${defender.name}</strong> is currently defending. You can stop the defense at any time.</p>`;
      html += `<button id="stop-defense-btn" class="btn">Defense Finished</button>`;
    } else {
      if (availableDefenders.length > 0) {
        html += `<p>Choose a player to defend an answer.</p><div class="judgement-grid">`;
        availableDefenders.forEach((p) => {
          html += `<button class="btn" data-player-id="${p.id}">${p.name}</button>`;
        });
        html += `</div>`;
      } else {
        html += `<p style="margin-top: 20px;">All players have defended!</p><button id="end-round-btn" class="btn">Proceed to Judgement</button>`;
      }
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    mainContent.appendChild(wrapper);
    if (state.currentDefenderId) {
      document.getElementById("stop-defense-btn").onclick = stopCurrentDefense;
    } else {
      document.querySelectorAll(".judgement-grid button").forEach((button) => {
        button.onclick = () => chooseDefender(button.dataset.playerId);
      });
    }
    if (document.getElementById("end-round-btn")) {
      document.getElementById("end-round-btn").onclick = () => {
        localGameState.currentPhase = "JUDGING";
        saveGameState(roomCode, localGameState);
      };
    }
  }

  function chooseDefender(playerId) {
    const usedAnswers = localGameState.usedAnswers || [];
    const availableAnswers = (localGameState.answers || []).filter(
      (ans) => !usedAnswers.includes(ans.answer)
    );
    if (!availableAnswers.length) {
      alert("No new answers to defend! Proceeding to judgement.");
      localGameState.currentPhase = "JUDGING";
      saveGameState(roomCode, localGameState);
      return;
    }
    const randomAnswer =
      availableAnswers[Math.floor(Math.random() * availableAnswers.length)];
    localGameState.currentDefenderId = parseInt(playerId);
    localGameState.currentAnswerToDefend = randomAnswer.answer;
    if (!localGameState.usedAnswers) localGameState.usedAnswers = [];
    localGameState.usedAnswers.push(randomAnswer.answer);
    saveGameState(roomCode, localGameState);
  }

  function stopCurrentDefense() {
    if (!localGameState.defendedPlayerIdsInRound)
      localGameState.defendedPlayerIdsInRound = [];
    localGameState.defendedPlayerIdsInRound.push(
      localGameState.currentDefenderId
    );
    localGameState.currentDefenderId = null;
    localGameState.currentAnswerToDefend = null;
    saveGameState(roomCode, localGameState);
  }

  function showJudgingScreen(state) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>Judgement</h2><p>Whose defense was the least convincing?</p><div class="judgement-grid"></div>`;
    const grid = wrapper.querySelector(".judgement-grid");
    getActiveDefenders(state).forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "btn judgement-btn";
      btn.textContent = p.name;
      btn.onclick = () => eliminatePlayer(p.id);
      grid.appendChild(btn);
    });
    mainContent.appendChild(wrapper);
  }

  function eliminatePlayer(playerId) {
    const player = localGameState.players.find((p) => p.id === playerId);
    if (player) player.isEliminated = true;
    if (getActiveDefenders(localGameState).length <= 1) {
      localGameState.currentPhase = "FINAL_ROUND_QUESTION";
      localGameState.currentQuestion = "";
      localGameState.answers = [];
      localGameState.finalAnswer = null;
    } else {
      startNewRound();
    }
    saveGameState(roomCode, localGameState);
  }

  function startNewRound() {
    localGameState.currentRound++;
    localGameState.currentPhase = "QUESTION_SELECTION";
    localGameState.currentQuestion = "";
    localGameState.answers = [];
    localGameState.usedAnswers = [];
    localGameState.currentDefenderId = null;
    localGameState.currentAnswerToDefend = null;
    localGameState.defendedPlayerIdsInRound = [];
    saveGameState(roomCode, localGameState);
  }

  function showFinalQuestionInput() {
    mainContent.innerHTML = `<div><h2>Final Question (Judge)</h2><p>Write the final question. The eliminated players will write answers for it.</p><textarea id="final-question-input"></textarea><button id="submit-final-question" class="btn">Unleash the Final Question</button></div>`;
    document.getElementById("submit-final-question").onclick = () => {
      const question = document
        .getElementById("final-question-input")
        .value.trim();
      if (question) {
        localGameState.currentQuestion = question;
        localGameState.currentPhase = "FINAL_ROUND_ANSWERING";
        saveGameState(roomCode, localGameState);
      } else {
        alert("Please write a final question.");
      }
    };
  }

  function showFinalRoundAnswering(state) {
    const finalist = getActiveDefenders(state)[0];
    const amITheJudge = localPlayer.playerId === state.judgeId;
    const amITheFinalist = localPlayer.playerId === finalist.id;
    const myPlayerData = state.players.find(
      (p) => p.id === localPlayer.playerId
    );

    if (amITheFinalist) {
      showWaitingScreen(
        "Get Ready, Finalist!",
        "The eliminated players are writing one last absurd answer for you based on the Judge's final question."
      );
      return;
    }
    if (amITheJudge) {
      const eliminatedPlayers = state.players.filter((p) => p.isEliminated);
      const finalAnswers = state.answers || [];

      if (finalAnswers.length >= eliminatedPlayers.length) {
        let html = `<h2>Final Answer Selection (Judge)</h2><p>Choose one of these ghost-written answers for ${finalist.name} to defend.</p>`;
        finalAnswers.forEach((ans) => {
          html += `<button class="question-btn" data-answer="${ans.answer}">${ans.answer}</button>`;
        });
        mainContent.innerHTML = `<div>${html}</div>`;
        document.querySelectorAll(".question-btn").forEach((btn) => {
          btn.onclick = () => {
            localGameState.finalAnswer = btn.dataset.answer;
            localGameState.currentPhase = "FINAL_ROUND_DEFENSE";
            saveGameState(roomCode, localGameState);
          };
        });
      } else {
        showWaitingScreen(
          "The Ghosts are Writing...",
          "The eliminated players are answering your final question. Soon you will choose one answer for the finalist to defend."
        );
      }
      return;
    }
    if (myPlayerData.isEliminated) {
      const myAnswer = (state.answers || []).find(
        (a) => a.playerId === localPlayer.playerId
      );
      if (myAnswer) {
        showWaitingScreen(
          "Final Answer Submitted!",
          "Waiting for other ghosts and the Judge."
        );
      } else {
        mainContent.innerHTML = `<div><h2>Write for the Finalist!</h2><p class="question-card">"${state.currentQuestion}"</p><p>Write one last, nasty answer for <strong>${finalist.name}</strong> to defend.</p><textarea id="answer-input"></textarea><button id="submit-answer-btn" class="btn">Submit Final Answer</button></div>`;
        document.getElementById("submit-answer-btn").onclick = () => {
          const answer = document.getElementById("answer-input").value.trim();
          if (answer) {
            if (!localGameState.answers) localGameState.answers = [];
            localGameState.answers.push({
              playerId: localPlayer.playerId,
              answer: answer,
            });
            saveGameState(roomCode, localGameState);
          }
        };
      }
    }
  }

  function showFinalRoundDefense(state) {
    const finalist = getActiveDefenders(state)[0];
    const amITheFinalist = localPlayer.playerId === finalist.id;
    const amITheJudge = localPlayer.playerId === state.judgeId;
    if (amITheJudge) {
      mainContent.innerHTML = `<div><h2>FINAL: Judgement</h2><p class="question-card">"${state.currentQuestion}"</p><p><strong>${finalist.name}</strong> is defending the answer:</p><div class="answer-to-defend">"${state.finalAnswer}"</div><p>Was this defense good enough to win?</p><button id="winner-btn" class="btn">Yes, a worthy winner!</button><button id="loser-btn" class="btn judgement-btn">No, that was terrible!</button></div>`;
      document.getElementById("winner-btn").onclick = () =>
        declareWinner(finalist);
      document.getElementById("loser-btn").onclick = () => declareWinner(null);
      return;
    }
    if (amITheFinalist) {
      mainContent.innerHTML = `<div><h2>FINAL: Your Last Defense!</h2><p class="question-card">"${state.currentQuestion}"</p><p>Defend this answer to win the game:</p><div class="answer-to-defend">"${state.finalAnswer}"</div></div>`;
      return;
    }
    showWaitingScreen(
      "The Final Defense",
      `Listen as ${finalist.name} defends their final answer!`
    );
  }

  function declareWinner(player) {
    localGameState.winner = player;
    localGameState.currentPhase = "END";
    saveGameState(roomCode, localGameState);
  }
});
