export function downloadNotes(notes) {
    if (notes.length > 0) {
        const json = JSON.stringify(notes, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'chart.json';
        link.click();
    }
}
