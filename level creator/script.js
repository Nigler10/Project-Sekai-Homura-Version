const music = document.getElementById('music');
const recordButton = document.getElementById('recordButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const playButton = document.getElementById('playButton');
const musicFileInput = document.getElementById('musicFile');
const chartFileInput = document.getElementById('chartFile');
const volumeControl = document.getElementById('volumeControl');
const lanes = ['A', 'S', 'D', 'F'];
const directionalKeys = {
    'A': 'ArrowLeft',
    'S': 'ArrowDown',
    'D': 'ArrowUp',
    'F': 'ArrowRight'
};

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
    const arrow = e.key;

    // Handle lane keys (A/S/D/F)
    if (lanes.includes(key)) {
        if (!keysPressed[key]) {
            const laneElement = document.getElementById('lane' + key);
            laneElement.classList.add('active');
            laneElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // original glow
        }
        keysPressed[key] = true;
        keysHit[key] = false;

        if (recording && holdStartTimes[key] === undefined) {
            holdStartTimes[key] = Date.now() - startTime;
        }
    }

    // Handle flick (arrow) keys
    for (const [laneKey, arrowKey] of Object.entries(directionalKeys)) {
        if (arrow === arrowKey) {
            if (!keysPressed[arrowKey]) {
                const laneElement = document.getElementById('lane' + laneKey);
                laneElement.classList.add('active');
                laneElement.style.backgroundColor = 'rgba(243, 51, 51, 0.3)'; // red glow
            }
            keysPressed[arrowKey] = true;
            keysHit[arrowKey] = false;

            if (recording) {
                notes.push({
                    type: 'flick',
                    time: Date.now() - startTime,
                    lane: laneKey
                });
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    const arrow = e.key;

    // Handle lane key releases
    if (lanes.includes(key)) {
        const laneElement = document.getElementById('lane' + key);
        laneElement.classList.remove('active');
        laneElement.style.backgroundColor = ''; // reset background
        keysPressed[key] = false;

        if (recording && holdStartTimes[key] !== undefined) {
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
    }

    // Handle flick (arrow) key releases
    for (const [laneKey, arrowKey] of Object.entries(directionalKeys)) {
        if (arrow === arrowKey) {
            const laneElement = document.getElementById('lane' + laneKey);
            laneElement.classList.remove('active');
            laneElement.style.backgroundColor = ''; // reset background
            keysPressed[arrowKey] = false;
        }
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
    const laneIndex = lanes.indexOf(data.lane);
    if (laneIndex === -1) return;

    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.lane = data.lane;
    note.dataset.type = data.type;

    if (data.type === 'tap') {
        note.style.height = '20px';
    } else if (data.type === 'flick') {
        note.style.height = '20px';
        note.classList.add('flick');
    } else if (data.type === 'hold') {
        const duration = data.endTime - data.startTime;
        const height = (duration / 1000) * fallSpeed * 60;
        note.style.height = height + 'px';
        note.dataset.startTime = data.startTime;
        note.dataset.endTime = data.endTime;
        note.dataset.holdProgress = '0';
        note.dataset.missed = 'false';

        let checkpoints = [];
        let seconds = (data.endTime - data.startTime) / 1000;
        for (let t = 1; t < seconds; t++) {
            checkpoints.push({ time: data.startTime + t * 1000, passed: false });
        }
        holdCheckpoints.push({ element: note, checkpoints: checkpoints, lane: data.lane });
    }

    note.style.left = (laneIndex * 100 + 10) + 'px';
    note.style.top = '-' + note.style.height;
    document.getElementById('game').appendChild(note);

    if (data.type === 'hold') {
        activeHoldNotes.push({
            element: note,
            startTime: data.startTime,
            endTime: data.endTime,
            lane: data.lane,
            holding: false,
            lastTick: 0
        });
    }
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
                document.getElementById('judgement').innerText = 'Miss Hold!';
            }
        }
    });

    document.querySelectorAll('.note').forEach(note => {
        const rect = note.getBoundingClientRect();
        const noteTop = rect.top;
        const lane = note.dataset.lane;

        if (note.dataset.type === 'tap') {
            if (noteTop >= hitZone.top - 30 && noteTop <= hitZone.bottom + 30) {
                if (keysPressed[lane] && !keysHit[lane]) {
                    combo++;
                    updateCombo();
                    document.getElementById('judgement').innerText = 'Perfect!';
                    note.remove();
                    keysHit[lane] = true;
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

        if (note.dataset.type === 'flick') {
            if (noteTop >= hitZone.top - 30 && noteTop <= hitZone.bottom + 30) {
                const expectedKey = directionalKeys[lane];
                if (keysPressed[expectedKey] && !keysHit[expectedKey]) {
                    combo++;
                    updateCombo();
                    document.getElementById('judgement').innerText = 'Flick!';
                    note.remove();
                    keysHit[expectedKey] = true;
                }
            } else if (noteTop > hitZone.bottom + 100) {
                hp -= 5;
                updateHp();
                combo = 0;
                updateCombo();
                document.getElementById('judgement').innerText = 'Miss Flick!';
                note.remove();
            }
        }
    });

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
