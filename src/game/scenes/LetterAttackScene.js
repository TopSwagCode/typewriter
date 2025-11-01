import { initTypingInput } from '../input/typingInput.js';
import { createLetterSpawner } from '../systems/spawnLetters.js';
import { createScoreSystem } from '../systems/scoreSystem.js';
import { updateScoreIfHigher } from '../../state/localStorage.js';
import { createShatter } from '../systems/shatterEffect.js';

export default class LetterAttackScene extends Phaser.Scene {
  constructor() {
    super('LetterAttack');
    this.letters = [];
  }

  preload() {
    // Placeholder for future assets (fonts, sounds). For now we rely on default text rendering.
  }

  create() {
  const intervalFromDifficulty = window.SPAWN_INTERVAL_MS || 1200;
  this.spawnConfig = { intervalMs: intervalFromDifficulty, lastSpawn: 0 };
  this.scoreSystem = createScoreSystem();
  this.lives = (window.STARTING_LIVES !== undefined ? window.STARTING_LIVES : 3);
    this.gameOver = false;

    this.letterSpawner = createLetterSpawner(this, this.letters);
    initTypingInput(this, this.letters, this.scoreSystem);

    this.hudEl = document.getElementById('hud');
  // Phaser hearts (text objects)
  this.hearts = [];
    this.endScreenEl = document.getElementById('end-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.bestScoreEl = document.getElementById('best-score');
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());
    // Fix bug. We don't want to restart if it's last life and we press R as wrong button.
    //window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r' && this.gameOver) this.restartGame(); });
    this.createHearts();
    this.updateHud();

    // Pause overlay reference
    this.pauseEl = document.getElementById('pause-overlay');
    this.isPaused = false;
  }

  setPaused(paused) {
    if (this.gameOver) return; // don't pause when game over
    this.isPaused = paused;
    if (this.pauseEl) this.pauseEl.style.display = paused ? 'flex' : 'none';
  }

  togglePause() {
    this.setPaused(!this.isPaused);
  }

  update(time, delta) {
    if (this.gameOver) return; // stop updates when game over
    if (this.isPaused) return; // freeze updates while paused
    // Spawn logic
    if (time - this.spawnConfig.lastSpawn >= this.spawnConfig.intervalMs) {
      this.spawnConfig.lastSpawn = time;
      this.letterSpawner.spawn();
    }

    // Update letters position
  const speedMultiplier = window.LETTER_SPEED_MULTIPLIER || 1;
    const centerX = this.game.config.width / 2;
    for (const l of this.letters) {
      if (l.state !== 'active') continue;
      // Vertical fall
      l.y += l.speed * (delta / 1000) * speedMultiplier;
      // Horizontal drift toward center (subtle)
      const driftStrength = 8; // px per second base toward center
      const dir = centerX - l.x; // distance to center
      l.x += (dir / 1000) * driftStrength * (delta / 16.67); // scaled drift
      // Wobble (sine) overlay
      l.wobblePhase += (delta / 1000) * 6; // wobble speed (radians per second)
      // Bounce phase (faster for faster letters)
      if (l.bouncePhase !== undefined) {
        l.bouncePhase += (delta / 1000) * (2 + (l.speed / 120)); // bounce speed scales with speed
      }
      const wobbleSin = Math.sin(l.wobblePhase);
      const wobbleOffset = wobbleSin * l.wobbleAmp;
      const bounceOffset = l.bouncePhase !== undefined ? Math.sin(l.bouncePhase) * l.bounceAmp : 0;
      l.textObj.setY(l.y + bounceOffset);
      l.textObj.setX(l.x + wobbleOffset);
      // Walking tilt (rotate a few degrees side to side)
      if (l.tiltAmpDeg) {
        l.textObj.setAngle(wobbleSin * l.tiltAmpDeg);
      }
      // Miss detection
      if (l.y >= this.game.config.height - 40) {
        l.state = 'missed';
        l.textObj.setColor('#f87171');
        this.scoreSystem.registerMiss();
        const prevLives = this.lives;
        this.loseLife();
        // Shake only if life was actually lost (flag may prevent life loss on wrong key but here it's a missed fall always loses life)
        if (this.lives < prevLives) {
          this.cameras.main.shake(500, 0.005);
        }
        this.updateHud();
      }
    }

    // Remove finished letters
    for (let i = this.letters.length - 1; i >= 0; i -= 1) {
      const l = this.letters[i];
      if (l.state === 'hit' || l.state === 'missed') {
        if (!l._fading) {
          // Missed fade-out path
          l._fading = true;
          this.tweens.add({
            targets: l.textObj,
            alpha: 0,
            duration: 280,
            ease: 'Quadratic.In',
            onComplete: () => l.textObj.destroy(),
          });
        }
        this.letters.splice(i, 1);
      }
    }
  }

  updateHud() {
    if (!this.hudEl) return;
    const { hits, misses } = this.scoreSystem.getStats();
    const hitsLabel = window.t ? window.t('hud.hits') : 'Hits';
    const missesLabel = window.t ? window.t('hud.misses') : 'Misses';
    this.hudEl.innerHTML = `${hitsLabel}: <span class="hit">${hits}</span> | ${missesLabel}: <span class="miss">${misses}</span>`;
  }

  createHearts() {
    // Clear existing hearts if any
    for (const h of this.hearts) { h.destroy(); }
    this.hearts.length = 0;
    const heartSymbol = '❤';
    const startX = this.game.config.width - 30; // right padding
    const y = 20;
  const spacing = 34; // increased spacing for larger hearts
    for (let i = 0; i < this.lives; i += 1) {
      const x = startX - (spacing * i);
      const heart = this.add.text(x, y, heartSymbol, {
        fontFamily: 'monospace',
        fontSize: '34px', // larger heart size
        color: '#f43f5e',
      }).setOrigin(0.5);
      this.hearts.push(heart);
    }
    this.refreshLowLifeEffect();
  }

  loseLife() {
    if (this.gameOver || this.lives <= 0) return;
    // Shatter last heart
    const heartObj = this.hearts[this.hearts.length - 1];
    if (heartObj) {
      createShatter(this, heartObj);
      heartObj.destroy();
      this.hearts.pop();
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.beginGameOverSequence();
    }
    this.refreshLowLifeEffect();
  }

  beginGameOverSequence() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clearLowLifeEffect();
    const { hits } = this.scoreSystem.getStats();
    const best = updateScoreIfHigher(hits);
    // Randomize remaining active letters for explosion
    const remaining = this.letters.filter(l => l.state === 'active');
    const shuffled = remaining.sort(() => Math.random() - 0.5);
  let delayAccum = 0;
  const perDelay = (window.GAMEOVER_EXPLOSION_INTERVAL_MS !== undefined ? window.GAMEOVER_EXPLOSION_INTERVAL_MS : 70);
    shuffled.forEach(l => {
      this.time.delayedCall(delayAccum, () => {
        if (l.textObj && !l._fading) {
          createShatter(this, l.textObj);
          l.textObj.destroy();
          l.state = 'hit'; // mark for removal
        }
      });
      delayAccum += perDelay;
    });
    // After explosions complete, finalize game over overlay
  const postDelay = (window.GAMEOVER_POST_EXPLOSIONS_DELAY_MS !== undefined ? window.GAMEOVER_POST_EXPLOSIONS_DELAY_MS : 250);
  this.time.delayedCall(delayAccum + postDelay, () => {
      // Clear letters array
      for (const ll of this.letters) {
        if (ll.textObj && !ll._fading) ll.textObj.destroy();
      }
      this.letters.length = 0;
  if (this.finalScoreEl) this.finalScoreEl.textContent = (window.t ? window.t('score.your', { score: hits }) : `Your Score: ${hits}`);
  if (this.bestScoreEl) this.bestScoreEl.textContent = (window.t ? window.t('score.best', { score: best }) : `Best Score: ${best}`);
      if (this.endScreenEl) this.endScreenEl.style.display = 'flex';
    });
  }

  triggerGameOver() { // retained for compatibility if called elsewhere
    this.gameOver = true;
    this.clearLowLifeEffect();
    // Clear remaining letters
    for (const l of this.letters) {
      if (l.textObj && !l._fading) l.textObj.destroy();
    }
    this.letters.length = 0;
    const { hits } = this.scoreSystem.getStats();
    const best = updateScoreIfHigher(hits);
  if (this.finalScoreEl) this.finalScoreEl.textContent = (window.t ? window.t('score.your', { score: hits }) : `Your Score: ${hits}`);
  if (this.bestScoreEl) this.bestScoreEl.textContent = (window.t ? window.t('score.best', { score: best }) : `Best Score: ${best}`);
    if (this.endScreenEl) this.endScreenEl.style.display = 'flex';
  }

  restartGame() {
  this.gameOver = false;
  this.lives = (window.STARTING_LIVES !== undefined ? window.STARTING_LIVES : 3);
    this.spawnConfig.lastSpawn = 0;
    this.scoreSystem = createScoreSystem();
    this.letters.length = 0;
    if (this.endScreenEl) this.endScreenEl.style.display = 'none';
    this.createHearts();
    this.updateHud();
  }

  refreshLowLifeEffect() {
    this.clearLowLifeEffect();
    if (this.gameOver) return;
    if (this.lives === 1 && this.hearts.length === 1) {
      const heart = this.hearts[0];
      // Pulse (scale + slight tint flash)
      this.lowLifeTween = this.tweens.add({
        targets: heart,
        scale: { from: 1, to: 1.25 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Quadratic.InOut'
      });
      // Optional color tween overlay (simple manual loop)
      heart.setTintFill(0xff4d6d);
    }
  }

  clearLowLifeEffect() {
    if (this.lowLifeTween) {
      this.lowLifeTween.stop();
      this.lowLifeTween = null;
    }
    if (this.hearts && this.hearts[0]) {
      this.hearts[0].clearTint();
      this.hearts[0].setScale(1);
    }
  }
}
