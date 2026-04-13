let tracks = [];
let currentIndex = 0;
let isDragging = false; // Для фикса ползунка
let loopMode = 0; // 0 - no loop, 1 - loop track, 2 - loop playlist

const audio = document.getElementById('audio-element');
const hls = new Hls();

async function init() {
    const res = await fetch('assets/tracks.json');
    const data = await res.json();
    tracks = data.tracks;
    renderPlaylist();
    
    // Загрузка настроек темы
    const savedTheme = localStorage.getItem('player-theme') || 'space';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-select').value = savedTheme;
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    tracks.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'track-card';
        div.innerHTML = `
            <img src="${track.cover}">
            <div>
                <div style="font-weight:600">${track.title}</div>
                <div style="color:var(--text-dim); font-size:13px">${track.artist}</div>
            </div>
        `;
        div.onclick = () => playTrack(index);
        container.appendChild(div);
    });
}

function playTrack(index) {
    currentIndex = index;
    const track = tracks[index];

    document.getElementById('mini-title').innerText = track.title;
    document.getElementById('full-title').innerText = track.title;
    document.getElementById('mini-artist').innerText = track.artist;
    document.getElementById('full-artist').innerText = track.artist;
    document.getElementById('mini-cover').src = track.cover;
    document.getElementById('full-cover').style.backgroundImage = `url(${track.cover})`;

    if (Hls.isSupported()) {
        hls.loadSource(track.src);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play());
    } else {
        audio.src = track.src;
        audio.play();
    }

    document.getElementById('mini-player').classList.remove('hidden');
    document.body.classList.add('paused');
}

// UI Controls
document.getElementById('expand-trigger').onclick = () => document.getElementById('full-player').classList.add('active');
document.getElementById('collapse-btn').onclick = () => document.getElementById('full-player').classList.remove('active');

const togglePlay = () => {
    if (audio.paused) {
        audio.play();
        document.body.classList.add('paused');
    } else {
        audio.pause();
        document.body.classList.remove('paused');
    }
};

document.getElementById('play-btn').onclick = togglePlay;
document.getElementById('mini-play-btn').onclick = (e) => { e.stopPropagation(); togglePlay(); };

const playNext = () => {
    if (loopMode === 1) { audio.currentTime = 0; audio.play(); return; }
    currentIndex = (currentIndex + 1) % tracks.length;
    playTrack(currentIndex);
};

document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = () => {
    if (audio.currentTime > 3) { audio.currentTime = 0; } 
    else { currentIndex = (currentIndex - 1 + tracks.length) % tracks.length; playTrack(currentIndex); }
};

// --- ИСПРАВЛЕНИЕ ПЕРЕМОТКИ И БУФЕР ---
const progress = document.getElementById('progress');

progress.addEventListener('input', () => { isDragging = true; });
progress.addEventListener('change', () => {
    audio.currentTime = (progress.value / 100) * audio.duration;
    isDragging = false;
});

audio.ontimeupdate = () => {
    if (!isDragging && audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100;
        document.getElementById('cur-time').innerText = formatTime(audio.currentTime);
        document.getElementById('dur-time').innerText = formatTime(audio.duration);
    }
};

// Читаем буфер нативно
audio.addEventListener('progress', () => {
    if (audio.duration > 0 && audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const p = (bufferedEnd / audio.duration) * 100;
        document.getElementById('buffer-fill').style.width = p + '%';
    }
});

audio.onended = playNext;

// --- LOOP & SETTINGS ---
const loopBtn = document.getElementById('loop-btn');
loopBtn.onclick = () => {
    loopMode = (loopMode + 1) % 3;
    // 0: Off, 1: Loop One, 2: Loop All
    loopBtn.style.backgroundColor = loopMode === 0 ? "var(--text-dim)" : "var(--accent)";
    loopBtn.style.opacity = loopMode === 1 ? "0.6" : "1"; // Костыль для отображения состояния
};

document.getElementById('open-settings').onclick = () => document.getElementById('settings-modal').classList.remove('hidden');
document.getElementById('close-settings').onclick = () => document.getElementById('settings-modal').classList.add('hidden');
document.getElementById('theme-select').onchange = (e) => {
    document.body.setAttribute('data-theme', e.target.value);
    localStorage.setItem('player-theme', e.target.value);
};

function formatTime(s) {
    if(!s || isNaN(s)) return "0:00";
    const m = Math.floor(s/60);
    const sec = Math.floor(s%60);
    return `${m}:${sec < 10 ? '0'+sec : sec}`;
}

init();

