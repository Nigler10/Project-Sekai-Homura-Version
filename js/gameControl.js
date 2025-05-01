import { updateCombo, updateHp } from './ui.js';

export function stopGame(state) {
    state.playing = false;
    state.recording = false;
    state.gameStopped = true;
    state.music.pause();
    document.querySelectorAll('.note').forEach(note => note.remove());
    state.playButton.innerText = "Play Mode";
}

export function resetGame(state) {
    stopGame(state);
    state.activeHoldNotes = [];
    state.holdCheckpoints = [];
    state.startTime = 0;
    state.combo = 0;
    state.hp = 500;
    updateHp(state);
    updateCombo(state);
    document.getElementById('judgement').innerText = '';
    state.keysPressed = {};
    state.keysHit = {};
    state.gameStopped = false;
}

export function endGame(state) {
    stopGame(state);
    alert('Game Over!');
}
