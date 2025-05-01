export function spawnNote(state, data) {
    const laneIndex = state.lanes.indexOf(data.lane);
    if (laneIndex === -1) return;

    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.lane = data.lane;
    note.dataset.type = data.type;

    if (data.type === 'tap') {
        note.style.height = '20px';
    } else if (data.type === 'hold') {
        const duration = data.endTime - data.startTime;
        const height = (duration / 1000) * state.fallSpeed * 60;
        note.style.height = height + 'px';
        note.dataset.startTime = data.startTime;
        note.dataset.endTime = data.endTime;
        note.dataset.holdProgress = '0';
        note.dataset.missed = 'false';

        const checkpoints = [];
        const seconds = (data.endTime - data.startTime) / 1000;
        for (let t = 1; t < seconds; t++) {
            checkpoints.push({ time: data.startTime + t * 1000, passed: false });
        }
        state.holdCheckpoints.push({ element: note, checkpoints, lane: data.lane });
    }

    note.style.left = (laneIndex * 100 + 10) + 'px';
    note.style.top = '-' + note.style.height;
    document.getElementById('game').appendChild(note);

    if (data.type === 'hold') {
        state.activeHoldNotes.push({
            element: note,
            startTime: data.startTime,
            endTime: data.endTime,
            lane: data.lane,
            holding: false,
            lastTick: 0
        });
    }
}
