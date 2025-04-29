const startButton = document.getElementById('startButton');
const songSelect = document.getElementById('songSelect');
const gameArea = document.getElementById('gameArea');
const lanes = ["a", "s", "d", "f"];
let fallingNotes = [];
let audio;
let chartData = [];
let offset = 0; // you can adjust if needed
let isPlaying = false;
let animationFrameId;
let hp = 100;
let combo = 0;

startButton.addEventListener('click', async () => {
    if (isPlaying) return;

    const songName = songSelect.value;
    if (!songName) {
        alert("Please select a song!");
        return;
    }

    // Clear previous notes
    fallingNotes = [];
    gameArea.innerHTML = '';

    // Load music and chart
    try {
        const musicSrc = `../songs/${songName}.mp3`;
        const chartSrc = `../charts/${songName}.json`;

        audio = new Audio(musicSrc);

        await loadChart(chartSrc);

        if (!chartData.length) {
            alert("Chart data is empty or failed to load.");
            return;
        }

        isPlaying = true;
        spawnNotes();
        audio.volume = 0.5; // softer volume
        audio.play().catch(e => {
            console.error("Audio play failed:", e);
            alert("Autoplay is blocked. Please interact with the page first (click).");
        });

    } catch (error) {
        console.error("Error loading assets:", error);
        alert("Failed to load song or chart. Check console for details.");
    }
});

function loadChart(chartSrc) {
    return fetch(chartSrc)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            chartData = data;
        })
        .catch(error => {
            console.error("Failed to load chart:", error);
            alert("Error loading chart JSON file.");
            chartData = [];
        });
}

function spawnNotes() {
    let noteIndex = 0;
    const startTime = Date.now();

    function gameLoop() {
        const currentTime = Date.now() - startTime + offset;

        // Spawn new notes based on chart
        while (noteIndex < chartData.length && currentTime >= chartData[noteIndex].time) {
            createNote(chartData[noteIndex].lane);
            noteIndex++;
        }

        moveNotes();

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

function createNote(lane) {
    const note = document.createElement('div');
    note.className = 'note ' + lane;
    note.style.left = (lanes.indexOf(lane) * 80 + 40) + 'px';
    note.style.top = '0px';
    gameArea.appendChild(note);
    fallingNotes.push({element: note, lane: lane, y: 0});
}

function moveNotes() {
    for (let i = 0; i < fallingNotes.length; i++) {
        fallingNotes[i].y += 7.5; // fall speed
        fallingNotes[i].element.style.top = fallingNotes[i].y + 'px';

        if (fallingNotes[i].y > 600) { // missed note
            gameArea.removeChild(fallingNotes[i].element);
            fallingNotes.splice(i, 1);
            i--;
            hp -= 10;
            combo = 0;
            updateStats();
        }
    }

    if (hp <= 0) {
        endGame();
    }
}

function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    audio.pause();
    alert("Game Over!");
}

function updateStats() {
    document.getElementById('hpDisplay').innerText = `HP: ${hp}`;
    document.getElementById('comboDisplay').innerText = `Combo: ${combo}`;
}

document.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    if (!lanes.includes(e.key)) return;

    for (let i = 0; i < fallingNotes.length; i++) {
        const note = fallingNotes[i];
        if (note.lane === e.key) {
            const distance = Math.abs(note.y - 500); // hit zone at 500px
            if (distance < 50) { // allow 50px hit window
                gameArea.removeChild(note.element);
                fallingNotes.splice(i, 1);
                combo++;
                hp = Math.min(100, hp + 2);
                updateStats();
                return;
            }
        }
    }

    // Missed
    hp -= 5;
    combo = 0;
    updateStats();
});
