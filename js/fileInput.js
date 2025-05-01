export function setupFileInputs(state) {
    state.musicFileInput.addEventListener('change', (e) => {
        const file = URL.createObjectURL(e.target.files[0]);
        state.music.src = file;
    });

    state.chartFileInput.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const parsed = JSON.parse(event.target.result);
            state.originalChartData = parsed;
            state.chartData = JSON.parse(JSON.stringify(parsed));
        };
        reader.readAsText(e.target.files[0]);
    });
}
