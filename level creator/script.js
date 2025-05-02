const music = document.getElementById('music');
const recordButton = document.getElementById('recordButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const playButton = document.getElementById('playButton');
const musicFileInput = document.getElementById('musicFile');
const chartFileInput = document.getElementById('chartFile');
const volumeControl = document.getElementById('volumeControl');
const lanes = ['A', 'S', 'D', 'F'];
const slideKeys = ['Q', 'W', 'E', 'R'];
const allKeys = [...lanes, ...slideKeys];
let slideBuffer = [];

let notes = [];
let recording = false;
let playing = false;
let chartData = [];
let originalChartData = [];
let activeHoldNotes = [];
let startTime;
let combo = 0;
let hp = 500;
let fallSpeed = 7.5;
let spawnOffset = 1200;
let keysPressed = {};
let keysHit = {};
let holdStartTimes = {};
let gameStopped = false;
let holdCheckpoints = [];

volumeControl.addEventListener('input', () => {
    music.volume = volumeControl.value;
});

musicFileInput.addEventListener('change', (e) => {
    const file = URL.createObjectURL(e.target.files[0]);
    music.src = file;
});

chartFileInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        originalChartData = JSON.parse(event.target.result);
        chartData = JSON.parse(event.target.result);
    };
    reader.readAsText(e.target.files[0]);
});

recordButton.addEventListener('click', () => {
    if (recording) return;
    resetGame();
    recording = true;
    notes = [];
    startTime = Date.now();
    music.currentTime = 0;
    music.volume = volumeControl.value;
    music.play();
});

stopRecordingButton.addEventListener('click', () => {
    if (!recording) return;
    recording = false;
    music.pause();
    downloadNotes();
});

playButton.addEventListener('click', () => {
    if (playing) {
        stopGame();
        return;
    }
    if (originalChartData.length === 0) return;
    resetGame();
    chartData = JSON.parse(JSON.stringify(originalChartData));
    playing = true;
    startTime = Date.now();
    music.currentTime = 0;
    music.volume = volumeControl.value;
    music.play();
    requestAnimationFrame(gameLoop);
    playButton.innerText = "Stop Game";
});

document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    if (!allKeys.includes(key)) return;

    if (!keysPressed[key]) {
        const laneId = lanes.includes(key) ? 'lane' + key : 'lane' + lanes[slideKeys.indexOf(key)];
        const laneElement = document.getElementById(laneId);

        if (slideKeys.includes(key)) {
            laneElement.classList.add('slide-active'); // New class for QWER
        } else {
            laneElement.classList.add('active');
        }
    }

    keysPressed[key] = true;
    keysHit[key] = false;

    if (recording) {
        if (slideKeys.includes(key)) {
            const now = Date.now() - startTime;

            if (
                slideBuffer.length &&
                now - slideBuffer[slideBuffer.length - 1].time < 300 &&
                slideBuffer[slideBuffer.length - 1].key !== key
            ) {
                notes.push({
                    type: 'slide',
                    from: slideBuffer[slideBuffer.length - 1].key,
                    to: key,
                    time: slideBuffer[slideBuffer.length - 1].time,
                    followupTime: now
                });
                slideBuffer = [];
            } else {
                slideBuffer.push({ key, time: now });
            }
        } else {
            if (holdStartTimes[key] === undefined) {
                holdStartTimes[key] = Date.now() - startTime;
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (!allKeys.includes(key)) return;

    const laneId = lanes.includes(key) ? 'lane' + key : 'lane' + lanes[slideKeys.indexOf(key)];
    const laneElement = document.getElementById(laneId);

    if (slideKeys.includes(key)) {
        laneElement.classList.remove('slide-active');
    } else {
        laneElement.classList.remove('active');
    }

    keysPressed[key] = false;

    if (recording && lanes.includes(key) && holdStartTimes[key] !== undefined) {
        const holdTime = Date.now() - startTime;
        const duration = holdTime - holdStartTimes[key];
        if (duration < 200) {
            notes.push({
                type: 'tap',
                time: holdStartTimes[key],
                lane: key
            });
        } else {
            notes.push({
                type: 'hold',
                startTime: holdStartTimes[key],
                endTime: holdTime,
                lane: key
            });
        }
        delete holdStartTimes[key];
    }
});

function gameLoop() {
    if (!playing || gameStopped) return;
    const now = Date.now();
    const elapsed = now - startTime;

    document.querySelectorAll('.note').forEach(note => {
        note.style.top = (parseFloat(note.style.top) + fallSpeed) + 'px';
    });

    handleActiveHoldNotes(elapsed);

    if (hp <= 0) {
        endGame();
        return;
    }

    while (chartData.length && elapsed >= (chartData[0].time || chartData[0].startTime) - spawnOffset) {
        spawnNote(chartData.shift());
    }

    requestAnimationFrame(gameLoop);
}

function spawnNote(data) {
    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.type = data.type;

    if (data.type === 'slide') {
        const duration = data.followupTime - data.time;
        const height = (duration / 1000) * fallSpeed * 60;
        note.style.height = height + 'px';
        note.style.background = 'magenta';
        note.dataset.startTime = data.time;
        note.dataset.endTime = data.followupTime;
        note.dataset.from = data.from;
        note.dataset.to = data.to;
        note.dataset.holdProgress = '0';
        note.dataset.missed = 'false';

        // Place slide note in correct lane (use same visual lanes as ASDF)
        const visualIndex = slideKeys.indexOf(data.from);
        if (visualIndex === -1) return; // Skip if invalid

        const correspondingLane = lanes[visualIndex];
        note.dataset.lane = correspondingLane;
        note.style.left = (visualIndex * 100 + 10) + 'px';
        note.style.top = `-${height}px`;

        // Checkpoints for tick events
        const checkpoints = [];
        const seconds = duration / 1000;
        for (let t = 1; t < seconds; t++) {
            checkpoints.push({ time: data.time + t * 1000, passed: false });
        }
        holdCheckpoints.push({
            element: note,
            checkpoints: checkpoints,
            lane: data.from,
            isSlide: true
        });

        activeHoldNotes.push({
            element: note,
            startTime: data.time,
            endTime: data.followupTime,
            lane: data.from,
            holding: false,
            lastTick: 0,
            isSlide: true
        });
    }

    else {
        const laneIndex = lanes.indexOf(data.lane);
        if (laneIndex === -1) return;

        note.dataset.lane = data.lane;
        note.style.left = (laneIndex * 100 + 10) + 'px';

        if (data.type === 'tap') {
            note.style.height = '20px';
        } else if (data.type === 'hold') {
            const duration = data.endTime - data.startTime;
            const height = (duration / 1000) * fallSpeed * 60;
            note.style.height = height + 'px';
            note.dataset.startTime = data.startTime;
            note.dataset.endTime = data.endTime;
            note.dataset.holdProgress = '0';
            note.dataset.missed = 'false';

            const checkpoints = [];
            const seconds = duration / 1000;
            for (let t = 1; t < seconds; t++) {
                checkpoints.push({ time: data.startTime + t * 1000, passed: false });
            }
            holdCheckpoints.push({
                element: note,
                checkpoints: checkpoints,
                lane: data.lane
            });

            activeHoldNotes.push({
                element: note,
                startTime: data.startTime,
                endTime: data.endTime,
                lane: data.lane,
                holding: false,
                lastTick: 0
            });
        }

        note.style.top = `-${note.style.height}`;
    }

    document.getElementById('game').appendChild(note);
}

function handleActiveHoldNotes(elapsed) {
    const hitZone = document.getElementById('hitZone').getBoundingClientRect();

    activeHoldNotes.forEach((noteObj, index) => {
        const rect = noteObj.element.getBoundingClientRect();
        const noteTop = rect.top;
        const noteBottom = rect.bottom;

        if (noteTop <= hitZone.bottom && noteBottom >= hitZone.top) {
            if (keysPressed[noteObj.lane]) {
                if (!noteObj.holding) {
                    combo++;
                    updateCombo();
                    showSmallText('Hold Start!');
                }
                noteObj.holding = true;
            } else if (noteObj.holding) {
                noteObj.holding = false;
                hp -= 1;
                updateHp();
                combo = 0;
                updateCombo();
                document.getElementById('judgement').innerText = 'Released Early!';
            }
        }

        if (noteObj.holding) {
            // Shrinking properly based on time
            let duration = (noteObj.endTime - noteObj.startTime) / 1000;
            let totalHeight = (duration) * fallSpeed * 60;
            let progress = (elapsed - noteObj.startTime) / (noteObj.endTime - noteObj.startTime);
            noteObj.element.style.height = Math.max(0, totalHeight * (1 - progress)) + 'px';

            if (elapsed - noteObj.lastTick >= 250) {
                combo++;
                updateCombo();
                showSmallText('+1');
                noteObj.lastTick = elapsed;
            }

            if (progress >= 1) {
                noteObj.element.remove();
                activeHoldNotes.splice(index, 1);
            }
        }

        if (noteBottom > hitZone.bottom + 100 && !noteObj.holding) {
            if (noteObj.element.dataset.missed !== 'true') {
                noteObj.element.dataset.missed = 'true';
                hp -= 1;
                updateHp();
                combo = 0;
                updateCombo();
                document.getElementById('judgement').innerText = noteObj.isSlide ? 'Miss Slide!' : 'Miss Hold!';
            }
        }
    });

    document.querySelectorAll('.note').forEach(note => {
        const rect = note.getBoundingClientRect();
        const noteTop = rect.top;
        if (note.dataset.type === 'tap') {
            if (noteTop >= hitZone.top - 30 && noteTop <= hitZone.bottom + 30) {
                if (keysPressed[note.dataset.lane] && !keysHit[note.dataset.lane]) {
                    combo++;
                    updateCombo();
                    document.getElementById('judgement').innerText = 'Perfect!';
                    note.remove();
                    keysHit[note.dataset.lane] = true;
                }
            } else if (noteTop > hitZone.bottom + 100) {
                hp -= 5;
                updateHp();
                combo = 0;
                updateCombo();
                document.getElementById('judgement').innerText = 'Miss!';
                note.remove();
            }
        }
    });

    // Check hold note checkpoints
    const now = Date.now() - startTime;
    holdCheckpoints.forEach(check => {
        check.checkpoints.forEach(cp => {
            if (!cp.passed && Math.abs(now - cp.time) <= 150) {
                if (keysPressed[check.lane]) {
                    cp.passed = true;
                    combo++;
                    updateCombo();
                    showSmallText('Checkpoint!');
                } else if (now > cp.time + 200) {
                    cp.passed = true;
                    hp -= 1;
                    updateHp();
                    combo = 0;
                    updateCombo();
                    document.getElementById('judgement').innerText = 'Missed Checkpoint!';
                }
            }
        });
    });

    document.querySelectorAll('.note').forEach(note => {
        if (note.dataset.type !== 'slide') return;

        const rect = note.getBoundingClientRect();
        const noteTop = rect.top;
        const hitZone = document.getElementById('hitZone').getBoundingClientRect();

        const from = note.dataset.from;
        const to = note.dataset.to;
        const noteTime = parseInt(note.dataset.time);
        const endTime = parseInt(note.dataset.endTime);
        const now = performance.now();
        const elapsedTime = now - noteTime;
        const slideDuration = endTime - noteTime;

        // Start the slide when both keys are pressed and note is in hit zone
        if (
            noteTop >= hitZone.top - 30 &&
            noteTop <= hitZone.bottom + 30 &&
            keysPressed[from] &&
            keysPressed[to] &&
            !note.hitStarted
        ) {
            note.hitStarted = true; // Mark slide as started
            note.dataset.startTime = now; // Save start time
            combo++;
            updateCombo();
            document.getElementById('judgement').innerText = 'Slide Start!';
        }

        // Finish slide if duration has passed after starting
        if (note.hitStarted && now - parseFloat(note.dataset.startTime) >= slideDuration) {
            note.remove();
            combo++;
            updateCombo();
            document.getElementById('judgement').innerText = 'Slide Complete!';
            const i = activeHoldNotes.findIndex(n => n.element === note);
            if (i !== -1) activeHoldNotes.splice(i, 1);
        }

        // Missed the slide entirely (fell below)
        if (!note.hitStarted && noteTop > hitZone.bottom + 100) {
            hp -= 5;
            updateHp();
            combo = 0;
            updateCombo();
            document.getElementById('judgement').innerText = 'Miss Slide!';
            note.remove();
        }
    });
}

function downloadNotes() {
    if (notes.length > 0) {
        const json = JSON.stringify(notes, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'chart.json';
        link.click();
    }
}

function updateHp() {
    const hpBar = document.getElementById('hp');
    hpBar.style.width = Math.max(0, hp / 5) + '%';
}

function updateCombo() {
    document.getElementById('combo').innerText = `Combo: ${combo}`;
}

function showSmallText(text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.top = '50px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.color = 'yellow';
    el.style.fontSize = '20px';
    el.style.animation = 'fadeOut 1s forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function stopGame() {
    playing = false;
    recording = false;
    gameStopped = true;
    music.pause();
    document.querySelectorAll('.note').forEach(note => note.remove());
    playButton.innerText = "Play Mode";
}

function resetGame() {
    stopGame();
    activeHoldNotes = [];
    holdCheckpoints = [];
    startTime = 0;
    combo = 0;
    hp = 500;
    updateHp();
    updateCombo();
    document.getElementById('judgement').innerText = '';
    keysPressed = {};
    keysHit = {};
    gameStopped = false;
}

function endGame() {
    stopGame();
    alert('Game Over!');
}
