export function updateHp(state) {
    const hpBar = document.getElementById('hp');
    hpBar.style.width = Math.max(0, state.hp / 5) + '%';
}

export function updateCombo(state) {
    document.getElementById('combo').innerText = `Combo: ${state.combo}`;
}

export function showSmallText(text) {
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
