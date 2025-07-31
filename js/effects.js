document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("effects-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let particles = [];
  let animationFrameId;

  const EMOJI_LIST = ["😂", "🤔", "🤯", " झूठ", "👑", "🔥", "✨", "🏆", "🧐"];
  const PARTICLE_COUNT = 30;
  const GRAVITY = 0.08;
  const FRICTION = 0.99;

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // --- Particle Class ---
  class Particle {
    constructor(x, y, emoji) {
      this.x = x;
      this.y = y;
      this.emoji = emoji;
      this.size = Math.random() * 24 + 24;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 4; // Initial upward boost
      this.alpha = 1;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += GRAVITY;
      this.vx *= FRICTION;
      this.vy *= FRICTION;
      this.rotation += this.rotationSpeed;
      if (this.y > height + this.size) {
        this.alpha = 0;
      } else {
        this.alpha -= 0.01;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.font = `${this.size}px "Montserrat"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
    }
  }

  function createBurst(x, y) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
      particles.push(new Particle(x, y, emoji));
    }
    if (!animationFrameId) {
      animate();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((p) => {
      if (p.alpha <= 0) return false;
      p.update();
      p.draw();
      return true;
    });

    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // --- Event Listeners ---
  // Allow clicks to pass through the canvas to UI elements, but still trigger effect
  document.body.addEventListener("click", (e) => {
    // Don't trigger effect if clicking on a button or input
    if (
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA"
    ) {
      return;
    }
    createBurst(e.clientX, e.clientY);
  });

  // --- Special Winner Effect ---
  window.startWinnerConfetti = () => {
    const duration = 5000; // 5 seconds
    const endTime = Date.now() + duration;

    const confettiInterval = setInterval(() => {
      if (Date.now() > endTime) {
        clearInterval(confettiInterval);
        return;
      }
      const x = Math.random() * width;
      createBurst(x, -20); // Start from above the screen
    }, 100);
  };
});
