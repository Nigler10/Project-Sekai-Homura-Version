export function setupAudio(state) {
    state.volumeControl.addEventListener('input', () => {
        state.music.volume = state.volumeControl.value;
    });
}
