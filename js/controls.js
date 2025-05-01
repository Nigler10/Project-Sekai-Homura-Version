import { resetGame, stopGame, endGame } from './gameControl.js';
import { downloadNotes } from './utils.js';

export function setupControls(state, gameLoop) {
    state.recordButton.addEventListener('click', () => {
        if (state.recording) return;
        resetGame(state);
        state.recording = true;
        state.notes = [];
        state.startTime = Date.now();
        state.music.currentTime = 0;
        state.music.volume = state.volumeControl.value;
        state.music.play();
    });

    state.stopRecordingButton.addEventListener('click', () => {
        if (!state.recording) return;
        state.recording = false;
        state.music.pause();
        downloadNotes(state.notes);
    });

    state.playButton.addEventListener('click', () => {
        if (state.playing) {
            stopGame(state);
            return;
        }
        if (state.originalChartData.length === 0) return;
        resetGame(state);
        state.chartData = JSON.parse(JSON.stringify(state.originalChartData));
        state.playing = true;
        state.startTime = Date.now();
        state.music.currentTime = 0;
        state.music.volume = state.volumeControl.value;
        state.music.play();
        requestAnimationFrame(() => gameLoop(state));
        state.playButton.innerText = "Stop Game";
    });
}
