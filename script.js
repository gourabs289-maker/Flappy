const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('score');
const pauseBtn = document.getElementById('pause-btn');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeBtn = document.getElementById('resume-btn');
const finalScoreElement = document.getElementById('final-score');

// Audio Synthesis (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let bgmOscillator;
let bgmGain;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

const sounds = {
    flap: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    score: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    },
    crash: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    },
    startBGM: () => {
        if (!audioCtx) return;
        if (bgmOscillator) return;

        bgmOscillator = audioCtx.createOscillator();
        bgmGain = audioCtx.createGain();

        bgmOscillator.connect(bgmGain);
        bgmGain.connect(audioCtx.destination);

        bgmOscillator.type = 'triangle';
        bgmGain.gain.value = 0.02; // Very quiet background track

        // Simple arpeggio loop using setPeriodicWave or just changing frequency periodically via interval
        bgmOscillator.frequency.value = 220;
        bgmOscillator.start();

        let noteIdx = 0;
        const notes = [220, 261.63, 329.63, 392.00, 329.63, 261.63];
        sounds.bgmInterval = setInterval(() => {
            if (bgmOscillator && audioCtx.state === 'running') {
                bgmOscillator.frequency.setValueAtTime(notes[noteIdx], audioCtx.currentTime);
                noteIdx = (noteIdx + 1) % notes.length;
            }
        }, 300);
    },
    stopBGM: () => {
        if (bgmOscillator) {
            bgmOscillator.stop();
            bgmOscillator.disconnect();
            bgmOscillator = null;
        }
        if (sounds.bgmInterval) {
            clearInterval(sounds.bgmInterval);
        }
    }
};

// Asset Generation (Inline Images)
const loadSVG = (svgString) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
    return img;
};

// Player Bird (Yellow with glasses and blue backwards cap)
const playerBirdSVG = `
<svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <ellipse cx="30" cy="20" rx="20" ry="15" fill="#f1c40f"/>
    <!-- Tail -->
    <polygon points="10,20 0,10 0,30" fill="#f1c40f"/>
    <!-- Wing -->
    <path d="M 25 15 Q 15 20 25 25" stroke="#e67e22" stroke-width="2" fill="none"/>
    <!-- Beak -->
    <polygon points="48,18 60,20 48,25" fill="#e67e22"/>
    <!-- Glasses -->
    <circle cx="40" cy="15" r="4" fill="none" stroke="black" stroke-width="2"/>
    <line x1="44" y1="15" x2="48" y2="15" stroke="black" stroke-width="2"/>
    <!-- Backwards Cap -->
    <path d="M 35 5 Q 30 0 20 5 L 20 10 L 40 10 Z" fill="#2980b9"/>
    <rect x="15" y="7" width="10" height="3" fill="#2980b9"/>
</svg>
`;

// Enemy Bird (Pink)
const enemyBirdPinkSVG = `
<svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="20" rx="20" ry="15" fill="#e84393"/>
    <polygon points="50,20 60,10 60,30" fill="#e84393"/>
    <path d="M 35 15 Q 45 20 35 25" stroke="#d63031" stroke-width="2" fill="none"/>
    <polygon points="12,18 0,20 12,25" fill="#fdcb6e"/>
    <circle cx="20" cy="15" r="2" fill="white"/>
    <circle cx="19" cy="15" r="1" fill="black"/>
</svg>
`;

// Enemy Bird (Blue)
const enemyBirdBlueSVG = `
<svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="20" rx="20" ry="15" fill="#0984e3"/>
    <polygon points="50,20 60,10 60,30" fill="#0984e3"/>
    <path d="M 35 15 Q 45 20 35 25" stroke="#74b9ff" stroke-width="2" fill="none"/>
    <polygon points="12,18 0,20 12,25" fill="#fdcb6e"/>
    <circle cx="20" cy="15" r="2" fill="white"/>
    <circle cx="19" cy="15" r="1" fill="black"/>
</svg>
`;

const assets = {
    player: loadSVG(playerBirdSVG),
    enemyPink: loadSVG(enemyBirdPinkSVG),
    enemyBlue: loadSVG(enemyBirdBlueSVG)
};

// Game Entities & Physics
const GRAVITY = 0.0015;
const FLAP_STRENGTH = -0.4;

let player = {
    x: 150,
    y: 300,
    width: 60,
    height: 40,
    velocity: 0
};

let enemies = [];
const ENEMY_SPEED = 0.3;
const SPAWN_RATE = 1500; // spawn every 1.5 seconds
let lastSpawnTime = 0;

// Game State
let gameState = 'START'; // START, PLAYING, PAUSED, GAME_OVER
let score = 0;
let lastTime = 0;
let animationId;

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'PLAYING') {
            flap();
        } else if (gameState === 'START' || gameState === 'GAME_OVER') {
            startGame();
        }
    }
});
window.addEventListener('mousedown', (e) => {
    // Only flap if we didn't click a UI button
    if (e.target.tagName !== 'BUTTON' && gameState === 'PLAYING') {
        flap();
    }
});

function flap() {
    player.velocity = FLAP_STRENGTH;
    sounds.flap();
}

function gameOver() {
    gameState = 'GAME_OVER';
    sounds.crash();
    sounds.stopBGM();
    cancelAnimationFrame(animationId);

    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

// Game Loop
function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (!deltaTime) return;

    // Physics
    player.velocity += GRAVITY * deltaTime;
    player.y += player.velocity * deltaTime;

    // Boundary checks (ceiling and floor)
    if (player.y < 0) {
        player.y = 0;
        player.velocity = 0;
    }

    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        gameOver();
    }

    // Enemy Spawning
    if (lastTime - lastSpawnTime > SPAWN_RATE) {
        spawnEnemy();
        lastSpawnTime = lastTime;
    }

    // Enemy Update & Collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.x -= ENEMY_SPEED * deltaTime;

        // Oscillation (flying motion)
        enemy.y += Math.sin(lastTime / 200 + enemy.oscillationOffset) * 1.5;

        // Collision Detection (AABB with slight forgiveness for better gameplay)
        const marginX = 10;
        const marginY = 8;
        if (
            player.x + marginX < enemy.x + enemy.width - marginX &&
            player.x + player.width - marginX > enemy.x + marginX &&
            player.y + marginY < enemy.y + enemy.height - marginY &&
            player.y + player.height - marginY > enemy.y + marginY
        ) {
            gameOver();
        }

        // Score updating
        if (!enemy.passed && enemy.x + enemy.width < player.x) {
            enemy.passed = true;
            score++;
            scoreElement.innerText = score;
            sounds.score();
        }

        // Remove off-screen enemies
        if (enemy.x + enemy.width < 0) {
            enemies.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const minHeight = 50;
    const maxHeight = canvas.height - 50 - 40; // 40 is enemy height
    const yPos = Math.random() * (maxHeight - minHeight) + minHeight;
    const isPink = Math.random() > 0.5;

    enemies.push({
        x: canvas.width,
        y: yPos,
        width: 60,
        height: 40,
        type: isPink ? 'pink' : 'blue',
        passed: false,
        oscillationOffset: Math.random() * Math.PI * 2
    });
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(150, 100, 30, 0, Math.PI * 2);
    ctx.arc(180, 100, 40, 0, Math.PI * 2);
    ctx.arc(220, 100, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(600, 150, 40, 0, Math.PI * 2);
    ctx.arc(650, 130, 50, 0, Math.PI * 2);
    ctx.arc(700, 150, 40, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(150, 400);
    ctx.lineTo(300, canvas.height);
    ctx.fill();

    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(200, canvas.height);
    ctx.lineTo(400, 350);
    ctx.lineTo(600, canvas.height);
    ctx.fill();

    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(500, canvas.height);
    ctx.lineTo(650, 420);
    ctx.lineTo(800, canvas.height);
    ctx.fill();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Draw enemies
    enemies.forEach(enemy => {
        const sprite = enemy.type === 'pink' ? assets.enemyPink : assets.enemyBlue;
        if (sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.fillStyle = enemy.type === 'pink' ? '#e84393' : '#0984e3';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });

    // Draw player
    if (assets.player.complete && assets.player.naturalWidth > 0) {
        // Simple rotation based on velocity
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (player.velocity * 0.1)));
        ctx.rotate(rotation);
        ctx.drawImage(assets.player, -player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore();
    } else {
        // Fallback
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

function startGame() {
    initAudio();
    sounds.startBGM();
    gameState = 'PLAYING';
    score = 0;
    scoreElement.innerText = score;

    // Reset player
    player.y = 300;
    player.velocity = 0;

    // Reset enemies
    enemies = [];
    lastSpawnTime = performance.now();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');

    lastTime = performance.now();

    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        pauseScreen.classList.remove('hidden');
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        cancelAnimationFrame(animationId);
    } else if (gameState === 'PAUSED') {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        gameState = 'PLAYING';
        pauseScreen.classList.add('hidden');
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Initial draw
draw();