import { handleActiveHoldNotes } from './holdLogic.js';
import { spawnNote } from './noteSpawner.js';
import { endGame } from './gameControl.js';

export function gameLoop(state) {
    if (!state.playing || state.gameStopped) return;
    const now = Date.now();
    const elapsed = now - state.startTime;

    document.querySelectorAll('.note').forEach(note => {
        note.style.top = (parseFloat(note.style.top) + state.fallSpeed) + 'px';
    });

    handleActiveHoldNotes(state, elapsed);

    if (state.hp <= 0) {
        endGame(state);
        return;
    }

    while (state.chartData.length && elapsed >= (state.chartData[0].time || state.chartData[0].startTime) - state.spawnOffset) {
        spawnNote(state, state.chartData.shift());
    }

    requestAnimationFrame(() => gameLoop(state));
}
