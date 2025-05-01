import { updateHp, updateCombo, showSmallText } from './ui.js';

export function handleActiveHoldNotes(state, elapsed) {
    const hitZone = document.getElementById('hitZone').getBoundingClientRect();

    state.activeHoldNotes.forEach((noteObj, index) => {
        const rect = noteObj.element.getBoundingClientRect();
        const noteTop = rect.top;
        const noteBottom = rect.bottom;

        if (noteTop <= hitZone.bottom && noteBottom >= hitZone.top) {
            if (state.keysPressed[noteObj.lane]) {
                if (!noteObj.holding) {
                    state.combo++;
                    updateCombo(state);
                    showSmallText('Hold Start!');
                }
                noteObj.holding = true;
            } else if (noteObj.holding) {
                noteObj.holding = false;
                state.hp -= 1;
                updateHp(state);
                state.combo = 0;
                updateCombo(state);
                document.getElementById('judgement').innerText = 'Released Early!';
            }
        }

        if (noteObj.holding) {
            let duration = (noteObj.endTime - noteObj.startTime) / 1000;
            let totalHeight = duration * state.fallSpeed * 60;
            let progress = (elapsed - noteObj.startTime) / (noteObj.endTime - noteObj.startTime);
            noteObj.element.style.height = Math.max(0, totalHeight * (1 - progress)) + 'px';

            if (elapsed - noteObj.lastTick >= 250) {
                state.combo++;
                updateCombo(state);
                showSmallText('+1');
                noteObj.lastTick = elapsed;
            }

            if (progress >= 1) {
                noteObj.element.remove();
                state.activeHoldNotes.splice(index, 1);
            }
        }

        if (noteBottom > hitZone.bottom + 100 && !noteObj.holding && noteObj.element.dataset.missed !== 'true') {
            noteObj.element.dataset.missed = 'true';
            state.hp -= 1;
            updateHp(state);
            state.combo = 0;
            updateCombo(state);
            document.getElementById('judgement').innerText = 'Miss Hold!';
        }
    });

    const now = Date.now() - state.startTime;
    state.holdCheckpoints.forEach(check => {
        check.checkpoints.forEach(cp => {
            if (!cp.passed && Math.abs(now - cp.time) <= 150) {
                if (state.keysPressed[check.lane]) {
                    cp.passed = true;
                    state.combo++;
                    updateCombo(state);
                    showSmallText('Checkpoint!');
                } else if (now > cp.time + 200) {
                    cp.passed = true;
                    state.hp -= 1;
                    updateHp(state);
                    state.combo = 0;
                    updateCombo(state);
                    document.getElementById('judgement').innerText = 'Missed Checkpoint!';
                }
            }
        });
    });

    document.querySelectorAll('.note').forEach(note => {
        const rect = note.getBoundingClientRect();
        const noteTop = rect.top;
        if (note.dataset.type === 'tap') {
            if (noteTop >= hitZone.top - 30 && noteTop <= hitZone.bottom + 30) {
                if (state.keysPressed[note.dataset.lane] && !state.keysHit[note.dataset.lane]) {
                    state.combo++;
                    updateCombo(state);
                    document.getElementById('judgement').innerText = 'Perfect!';
                    note.remove();
                    state.keysHit[note.dataset.lane] = true;
                }
            } else if (noteTop > hitZone.bottom + 100) {
                state.hp -= 5;
                updateHp(state);
                state.combo = 0;
                updateCombo(state);
                document.getElementById('judgement').innerText = 'Miss!';
                note.remove();
            }
        }
    });
}
