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
    // Load keystroke sound (mono sample) for hit feedback
    this.load.audio('keystroke', ['src/assets/Keystroke.wav']);
    // Load error sound for wrong key / life loss feedback
    this.load.audio('error', ['src/assets/Error.wav']);
    // Load low-life heartbeat loop (ambient)
    this.load.audio('heartbeat', ['src/assets/AMBIENCE_HEARTBEAT_LOOP.wav']);
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

    // Prepare hit sound instance pool (Phaser manages single instances; we can just play with rate variation)
    this.hitSound = this.sound.add('keystroke');
    this.errorSound = this.sound.add('error');
    this.heartbeatSound = this.sound.add('heartbeat', { loop: true });
    this.updateSfxVolume(typeof window.SFX_VOLUME === 'number' ? window.SFX_VOLUME : 0.8);
    // Track all characters successfully hit this run
    this.hitLetters = [];

    // Miss flash overlay setup (single full-screen rectangle reused)
    const { width, height } = this.game.config;
    this.missFlashRect = this.add.rectangle(width/2, height/2, width, height, 0xf43f5e)
      .setAlpha(0)
      .setDepth(1000);
  }

  setPaused(paused) {
    if (this.gameOver) return; // don't pause when game over
    this.isPaused = paused;
    if (this.pauseEl) this.pauseEl.style.display = paused ? 'flex' : 'none';
  }

  togglePause() {
    this.setPaused(!this.isPaused);
  }

  playHitSound() {
    if (!this.hitSound) return;
    // Randomize playback rate around 1.0 using global range (+/-)
    const varRange = (window.HIT_SOUND_PITCH_RANDOMIZATION !== undefined ? window.HIT_SOUND_PITCH_RANDOMIZATION : 0);
    const r = varRange > 0 ? 1 + (Math.random() * 2 * varRange - varRange) : 1;
    // For small variations we can reuse same sound; stop if still playing to avoid stacking artifacts
    if (this.hitSound.isPlaying) this.hitSound.stop();
    this.hitSound.setRate(r);
    this.hitSound.play({ volume: this.currentSfxVolume });
  }

  playErrorSound() {
    if (!this.errorSound) return;
    const varRange = (window.HIT_SOUND_PITCH_RANDOMIZATION !== undefined ? window.HIT_SOUND_PITCH_RANDOMIZATION : 0);
    const r = varRange > 0 ? 1 + (Math.random() * 2 * varRange - varRange) : 1;
    if (this.errorSound.isPlaying) this.errorSound.stop();
    this.errorSound.setRate(r);
    this.errorSound.play({ volume: this.currentSfxVolume });
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
  // Horizontal drift: smooth easing toward center based on vertical progress
  // Progress (0 at spawn, ~1 near bottom)
  const progress = Phaser.Math.Clamp(l.y / (this.game.config.height - 60), 0, 1);
  // Desired horizontal movement this frame (toward center) scaled by progress^0.85 for gentle start
  const dirToCenter = centerX - l.x;
  // Limit base horizontal speed so letters don't rush center; scale with progress
  const maxHorizontalPerSecond = 40 * Math.pow(progress, 0.85); // caps early drift, increases later
  // Convert desired movement into small step using easing toward center
  const desiredStep = dirToCenter * 0.015 * progress; // small proportional step
  const cappedStep = Phaser.Math.Clamp(desiredStep, -maxHorizontalPerSecond * (delta / 1000), maxHorizontalPerSecond * (delta / 1000));
  l.x += cappedStep;
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

  loseLife(fromWrongKey = false) {
    if (this.gameOver || this.lives <= 0) return;
    // Shatter last heart
    const heartObj = this.hearts[this.hearts.length - 1];
    if (heartObj) {
      createShatter(this, heartObj);
      heartObj.destroy();
      this.hearts.pop();
    }
    this.lives -= 1;
    // Play error sound on any life loss
    this.playErrorSound();
    if (this.lives <= 0) {
      this.beginGameOverSequence();
    }
    this.refreshLowLifeEffect();
  }

  beginGameOverSequence() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.clearLowLifeEffect();
    this.stopHeartbeat();
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
          if (this.playHitSound) this.playHitSound();
          l.textObj.destroy();
          l.state = 'hit'; // mark for removal
        }
      });
      delayAccum += perDelay;
    });
  // After explosions complete, finalize and transition to Jar visualization scene
  const postDelay = (window.GAMEOVER_POST_EXPLOSIONS_DELAY_MS !== undefined ? window.GAMEOVER_POST_EXPLOSIONS_DELAY_MS : 250);
  this.time.delayedCall(delayAccum + postDelay, () => {
      // Clear letters array
      for (const ll of this.letters) {
        if (ll.textObj && !ll._fading) ll.textObj.destroy();
      }
      this.letters.length = 0;
  if (this.finalScoreEl) this.finalScoreEl.textContent = (window.t ? window.t('score.your', { score: hits }) : `Your Score: ${hits}`);
  if (this.bestScoreEl) this.bestScoreEl.textContent = (window.t ? window.t('score.best', { score: best }) : `Best Score: ${best}`);
      // Launch JarScene with collected letters data
      if (this.scene && this.scene.start) {
        this.scene.start('JarScene', { letters: this.hitLetters.slice() });
      } else if (this.endScreenEl) {
        // Fallback to existing overlay if JarScene unavailable
        this.endScreenEl.style.display = 'flex';
      }
    });
  }

  triggerGameOver() { // retained for compatibility if called elsewhere
    this.gameOver = true;
    this.clearLowLifeEffect();
    this.stopHeartbeat();
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
    this.stopHeartbeat(); // will start again if low life condition met
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
      this.startHeartbeat();
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

  startHeartbeat() {
    if (!this.heartbeatSound) return;
    if (this.heartbeatSound.isPlaying) return; // already running
    this.heartbeatSound.play({ volume: this.currentSfxVolume * 0.75 }); // slightly quieter loop
  }

  stopHeartbeat() {
    if (this.heartbeatSound && this.heartbeatSound.isPlaying) {
      this.heartbeatSound.stop();
    }
  }

  updateSfxVolume(vol) {
    this.currentSfxVolume = Math.min(1, Math.max(0, vol));
    // Adjust active looping sounds
    if (this.heartbeatSound && this.heartbeatSound.isPlaying) {
      this.heartbeatSound.setVolume(this.currentSfxVolume * 0.75);
    }
  }

  triggerMissFlash() {
    if (!this.missFlashRect) return;
    this.missFlashRect.setAlpha(0.55);
    // Fade out quickly
    this.tweens.add({
      targets: this.missFlashRect,
      alpha: 0,
      duration: 160,
      ease: 'Quadratic.Out'
    });
  }
}
