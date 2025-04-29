const music = document.getElementById('music');
const recordButton = document.getElementById('recordButton');
const playButton = document.getElementById('playButton');
const musicFileInput = document.getElementById('musicFile');
const chartFileInput = document.getElementById('chartFile');
const volumeControl = document.getElementById('volumeControl');
const lanes = ['A', 'S', 'D', 'F'];

let notes = [];
let recording = false;
let playing = false;
let chartData = [];
let activeHoldNotes = [];
let startTime;
let combo = 0;
let hp = 500;
let fallSpeed = 7.5;
let spawnOffset = 1200;
let keysPressed = {};
let keysHit = {}; // To avoid multiple hits per press
let holdStartTimes = {};
let gameStopped = false;

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
    music.play();
});

playButton.addEventListener('click', () => {
    if (playing) {
        stopGame();
        return;
    }
    if (chartData.length === 0) return;
    resetGame();
    playing = true;
    startTime = Date.now();
    music.currentTime = 0;
    music.play();
    requestAnimationFrame(gameLoop);
    playButton.innerText = "Stop Game";
});

document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    if (!lanes.includes(key)) return;

    if (!keysPressed[key]) {
        document.getElementById('lane' + key).classList.add('active');
    }

    keysPressed[key] = true;
    keysHit[key] = false; // Allow fresh hit when pressed down

    if (recording) {
        if (holdStartTimes[key] === undefined) {
            holdStartTimes[key] = Date.now() - startTime;
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (!lanes.includes(key)) return;

    document.getElementById('lane' + key).classList.remove('active');
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
    } else if (data.type === 'hold') {
        const duration = data.endTime - data.startTime;
        const height = (duration / 1000) * fallSpeed * 60;
        note.style.height = height + 'px';
        note.dataset.endTime = data.endTime;
    }

    note.style.left = (laneIndex * 100 + 10) + 'px';
    note.style.top = '-' + note.style.height; // Start fully hidden
    document.getElementById('game').appendChild(note);

    if (data.type === 'hold') {
        activeHoldNotes.push({ element: note, startTime: data.startTime, endTime: data.endTime, lane: data.lane, holding: false });
    }
}

function handleActiveHoldNotes(elapsed) {
    const hitZone = document.getElementById('hitZone').getBoundingClientRect();

    activeHoldNotes.forEach((noteObj, index) => {
        const rect = noteObj.element.getBoundingClientRect();
        const noteTop = rect.top;

        if (!noteObj.holding && noteTop >= hitZone.top - 30 && noteTop <= hitZone.top + 30) {
            if (keysPressed[noteObj.lane]) {
                noteObj.holding = true;
            }
        }

        if (noteObj.holding) {
            if (!keysPressed[noteObj.lane]) {
                hp -= 2;
                updateHp();
                document.getElementById('judgement').innerText = 'Miss! (Released Early)';
                noteObj.element.remove();
                activeHoldNotes.splice(index, 1);
            } else if (elapsed >= noteObj.endTime) {
                combo++;
                updateCombo();
                document.getElementById('judgement').innerText = 'Perfect Hold!';
                noteObj.element.remove();
                activeHoldNotes.splice(index, 1);
            }
        }
    });

    document.querySelectorAll('.note').forEach(note => {
        const rect = note.getBoundingClientRect();
        const noteTop = rect.top;

        if (note.dataset.type === 'tap' && noteTop >= hitZone.top - 30 && noteTop <= hitZone.top + 30) {
            if (keysPressed[note.dataset.lane] && !keysHit[note.dataset.lane]) {
                combo++;
                updateCombo();
                document.getElementById('judgement').innerText = 'Perfect!';
                note.remove();
                keysHit[note.dataset.lane] = true; // Block multiple hits
            }
        } else if (noteTop > hitZone.top + 100) {
            if (note.dataset.type === 'tap') {
                hp -= 2;
                updateHp();
                document.getElementById('judgement').innerText = 'Miss!';
                combo = 0;
                updateCombo();
                note.remove();
            }
        }
    });
}

function updateHp() {
    const hpBar = document.getElementById('hp');
    hpBar.style.width = Math.max(0, hp / 5) + '%';
}

function updateCombo() {
    document.getElementById('combo').innerText = `Combo: ${combo}`;
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
    chartData = [...chartData]; // Keep original chart if needed
    activeHoldNotes = [];
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

window.onbeforeunload = () => {
    if (recording && notes.length > 0) {
        const json = JSON.stringify(notes, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'chart.json';
        link.click();
    }
};
