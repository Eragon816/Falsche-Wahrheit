function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getRoomCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
}

function getGameRef(roomCode) {
    return database.ref('games/' + roomCode);
}

function saveGameState(roomCode, state) {
    if (!roomCode) return;
    const gameRef = getGameRef(roomCode);
    gameRef.set(state);
}

function clearGameState(roomCode) {
    if (!roomCode) return;
    const gameRef = getGameRef(roomCode);
    gameRef.remove();
}