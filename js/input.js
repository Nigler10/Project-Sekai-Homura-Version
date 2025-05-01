export function setupKeyEvents(state) {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toUpperCase();
        if (!state.lanes.includes(key)) return;
        if (!state.keysPressed[key]) {
            document.getElementById('lane' + key).classList.add('active');
        }
        state.keysPressed[key] = true;
        state.keysHit[key] = false;
        if (state.recording && state.holdStartTimes[key] === undefined) {
            state.holdStartTimes[key] = Date.now() - state.startTime;
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toUpperCase();
        if (!state.lanes.includes(key)) return;
        document.getElementById('lane' + key).classList.remove('active');
        state.keysPressed[key] = false;

        if (state.recording && state.holdStartTimes[key] !== undefined) {
            const holdTime = Date.now() - state.startTime;
            const duration = holdTime - state.holdStartTimes[key];
            if (duration < 200) {
                state.notes.push({ type: 'tap', time: state.holdStartTimes[key], lane: key });
            } else {
                state.notes.push({ type: 'hold', startTime: state.holdStartTimes[key], endTime: holdTime, lane: key });
            }
            delete state.holdStartTimes[key];
        }
    });
}
