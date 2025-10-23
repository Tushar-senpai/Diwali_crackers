const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

// Arrays to hold our fireworks and particles
let fireworks = [];
let particles = [];

// --- Configuration (mutable where appropriate) ---
let LAUNCH_INTERVAL = 2000; // Automatic launch interval in ms (adjustable)
let PARTICLE_COUNT = 300;   // Particles per explosion (adjustable)
const GRAVITY = 0.06;
const FRICTION = 0.995;
let isRunning = true;
let autoLaunchTimer = null;

// Keep track of device pixel ratio for crisp rendering
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Set the internal canvas resolution higher for high-DPI screens
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    // CSS size stays the same
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    // Reset transforms and scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Function to get a random HSL color string
function getRandomColor() {
    const hue = Math.random() * 360;
    return `hsl(${hue}, 100%, 50%)`;
}
        
// (handled by resizeCanvas)

// --- Particle Class ---
// Represents a single spark from an explosion
class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1; // Lifespan/opacity
        this.size = Math.random() * 2 + 0.8;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        // Add a soft glow
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }

    update() {
        // Apply friction to slow down
        this.velocity.x *= FRICTION;
        this.velocity.y *= FRICTION;

        // Apply gravity
        this.velocity.y += GRAVITY;

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Fade out over time
        this.alpha -= 0.02 + Math.random() * 0.01;

        this.draw();
    }
}

// --- Firework Class ---
// Represents the initial rocket launch
class Firework {
    constructor(startX, startY, endX, endY) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.color = getRandomColor();
        this.distanceToEnd = Math.hypot(endX - startX, endY - startY);
        this.distanceTraveled = 0;

        // Calculate the angle for movement
        this.angle = Math.atan2(endY - startY, endX - startX);
        this.speed = 4;
        this.acceleration = 1.06;
        this.velocity = {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed
        };
    }

    draw() {
        ctx.beginPath();
        const trailX = this.x - this.velocity.x * 2;
        const trailY = this.y - this.velocity.y * 2;
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    update() {
        this.speed *= this.acceleration;
        this.velocity = {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed
        };

        const traveledX = this.startX - this.x;
        const traveledY = this.startY - this.y;
        this.distanceTraveled = Math.hypot(traveledX, traveledY);

        // If the firework has reached its destination, create an explosion
        if (this.distanceTraveled >= this.distanceToEnd) {
            this.explode();
            // Mark for removal by returning true
            return true;
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.draw();
            // Keep it
            return false;
        }
    }

    explode() {
        // Create particles for the explosion
        const count = Math.max(20, Math.min(800, PARTICLE_COUNT));
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            particles.push(new Particle(this.x, this.y, this.color, velocity));
        }
    }
}
        
        // --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Draw a semi-transparent background to create a trail effect
    ctx.fillStyle = 'rgba(8, 8, 20, 0.16)';
    // Use CSS pixel size so the scaled context maps correctly
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (!isRunning) return; // freeze animation when paused

    // Update and draw fireworks (use filter to safely remove finished ones)
    fireworks = fireworks.filter((fw) => !fw.update());

    // Update and draw particles and remove faded ones
    particles = particles.filter((p) => {
        p.update();
        return p.alpha > 0;
    });
}
        
        // --- Event Listeners and Launchers ---
function launchFirework(targetX, targetY) {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight;
    fireworks.push(new Firework(startX, startY, targetX, targetY));
}

// Launch on click/tap (wired below once)

// Launch automatically
function autoLaunch() {
    const targetX = Math.random() * window.innerWidth;
    const targetY = Math.random() * window.innerHeight * 0.45;
    launchFirework(targetX, targetY);
}

function startAutoLaunch() {
    stopAutoLaunch();
    autoLaunchTimer = setInterval(autoLaunch, LAUNCH_INTERVAL);
}

function stopAutoLaunch() {
    if (autoLaunchTimer) {
        clearInterval(autoLaunchTimer);
        autoLaunchTimer = null;
    }
}

// Controls wiring
const playPauseBtn = document.getElementById('playPause');
const particleRange = document.getElementById('particleCount');
const particleValue = document.getElementById('particleValue');
const intervalRange = document.getElementById('interval');
const intervalValue = document.getElementById('intervalValue');
const launchBtn = document.getElementById('launchBtn');

playPauseBtn.addEventListener('click', () => {
    isRunning = !isRunning;
    playPauseBtn.textContent = isRunning ? 'Pause' : 'Play';
    playPauseBtn.setAttribute('aria-pressed', String(isRunning));
    if (isRunning) startAutoLaunch(); else stopAutoLaunch();
});

particleRange.addEventListener('input', (e) => {
    PARTICLE_COUNT = Number(e.target.value);
    particleValue.textContent = String(PARTICLE_COUNT);
});

intervalRange.addEventListener('input', (e) => {
    LAUNCH_INTERVAL = Number(e.target.value);
    intervalValue.textContent = String(LAUNCH_INTERVAL);
    if (autoLaunchTimer) startAutoLaunch();
});

launchBtn.addEventListener('click', () => {
    autoLaunch();
});

// Initialize control displays
if (particleRange && particleValue) particleValue.textContent = String(particleRange.value || PARTICLE_COUNT);
if (intervalRange && intervalValue) intervalValue.textContent = String(intervalRange.value || LAUNCH_INTERVAL);

// Single click/touch listeners
canvas.addEventListener('click', (e) => {
    launchFirework(e.clientX, e.clientY);
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    const touch = e.touches[0];
    launchFirework(touch.clientX, touch.clientY);
});

// Keyboard: space toggles play/pause
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        playPauseBtn.click();
    }
});


// Start animation and auto-launch
startAutoLaunch();
animate();
autoLaunch(); // Launch one immediately on start
