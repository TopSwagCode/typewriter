export default class JarScene extends Phaser.Scene {
  constructor() {
    super('JarScene');
  }

  init(data) {
    this.collectedLetters = Array.isArray(data.letters) ? data.letters : [];
    this.debugRadiusOverride = (data && typeof data.debugRadius === 'number') ? data.debugRadius : null;
    this.debugFontSizeOverride = (data && typeof data.debugFontSize === 'number') ? data.debugFontSize : null;
    // debugRadiusOverride controls physics collision size; debugFontSizeOverride allows uncoupled visual scaling.
    // If font size override absent, we derive from radius for a balanced appearance.
  }

  create() {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width/2, height/2, width, height, 0x10141a).setAlpha(0.92).setDepth(-1);
    // External HTML now handles title/back/total; show the jar info container.
    const jarInfoEl = document.getElementById('jar-info');
    const jarTotalEl = document.getElementById('jar-total');
    const jarBackBtn = document.getElementById('jar-back-btn');
    if (jarInfoEl) jarInfoEl.style.display = 'block';
    if (jarTotalEl) jarTotalEl.textContent = (window.t ? window.t('jar.total', { count: this.collectedLetters.length }) : `Total: ${this.collectedLetters.length}`);
    if (jarBackBtn && !this._backBound) {
      jarBackBtn.addEventListener('click', () => {
        window.dispatchEvent(new Event('tw_back_to_menu_request'));
      });
      this._backBound = true;
    }

    // Jar bounds
  // Further expanded jar size to allow bigger letters & deeper stacking
  this.jarWidth = 300;
  this.jarHeight = 300;
    this.jarX = width/2;
    this.jarY = height/2 + 30;
    const outline = this.add.rectangle(this.jarX, this.jarY, this.jarWidth, this.jarHeight, 0x000000).setStrokeStyle(3, 0x6ee7b7, 0.85);
    outline.setFillStyle(0x1e2530, 0.55);

    // Physics config
    const phys = window.JAR_PHYSICS || { gravityY: 320, bounce: 0.42, floorDamp: 0.65, horizontalFriction: 0.92 };
    this.gravityY = phys.gravityY;
    this.bounceCoeff = phys.bounce;
    this.floorDamp = phys.floorDamp;
    this.horizontalFriction = phys.horizontalFriction;

    this.letterBodies = [];
  this.debugCircles = [];
    const padding = 12;
    const innerLeft = this.jarX - this.jarWidth/2 + padding;
    const innerRight = this.jarX + this.jarWidth/2 - padding;
    const innerTop = this.jarY - this.jarHeight/2 + padding;
    const innerBottom = this.jarY + this.jarHeight/2 - padding;

  // Staggered spawn setup (slice only to safeguard extreme counts)
  const maxSlice = (window.JAR_PHYSICS && typeof window.JAR_PHYSICS.maxSlice === 'number') ? window.JAR_PHYSICS.maxSlice : 1000;
    this.spawnQueue = this.collectedLetters.slice(0, maxSlice).map(item => {
      if (typeof item === 'string') {
        return { char: item.toUpperCase(), color: '#f8fafc' };
      }
      // Expect shape {char,color,tier}
      const upper = (item.char || '').toUpperCase();
      return { char: upper || '?', color: item.color || '#f8fafc', tier: item.tier };
    });
  this.spawnIntervalMs = 36; // adjusted spawn cadence for bigger jar
    this._lastSpawnTime = 0;
    this._innerLeft = innerLeft; this._innerRight = innerRight; this._innerTop = innerTop;

  // We no longer create in-canvas total/back; updates handled externally.

    // Keybinding for toggling physics bodies visualization (B)
    this.input.keyboard.on('keydown-B', () => {
      window.JAR_SHOW_BODY_DEBUG = !window.JAR_SHOW_BODY_DEBUG;
      this.refreshDebugBodiesVisibility();
    });
  }

  update(time, delta) {
    if (!this.letterBodies) return;
    const dt = delta / 1000;
    // Staggered spawning
    if (this.spawnQueue && this.spawnQueue.length > 0) {
      if (time - this._lastSpawnTime >= this.spawnIntervalMs) {
        this._lastSpawnTime = time;
  const item = this.spawnQueue.shift();
  const ch = item.char;
        const spawnX = Phaser.Math.Linear(this._innerLeft, this._innerRight, Math.random());
  // Spawn closer to jar top to avoid getting stuck too high
  const spawnY = this._innerTop - 30 - (Math.random() * 40);
          // Use configured bodyRadius & fontSize unless overridden by debug sliders.
          const baseRadius = this.debugRadiusOverride || (window.JAR_PHYSICS ? window.JAR_PHYSICS.bodyRadius : 18);
          const fontSize = this.debugFontSizeOverride || (window.JAR_PHYSICS ? window.JAR_PHYSICS.fontSize : Math.round(baseRadius * 1.8));
  const txt = this.add.text(spawnX, spawnY, ch, { fontFamily:(window.GAME_FONT_FAMILY || 'JetBrainsMono'), fontSize: `${fontSize}px`, color: item.color || '#f8fafc' }).setOrigin(0.5);
        txt.setScale(0.1);
        this.tweens.add({ targets: txt, scale: 1, duration: 200, ease: 'Back.Out' });
        // Increased radius for larger collision area (approx half width of glyph)
  // Physics body definition; radius comes from override to allow interactive sizing.
  const body = { sprite: txt, x: spawnX, y: spawnY, vx: (Math.random()*90 - 45), vy: (Math.random()*-60), resting: false, radius: baseRadius };
        this.letterBodies.push(body);
        // Debug circle (physics body visualization)
        const dbg = this.add.circle(spawnX, spawnY, body.radius, 0xff0000, 0.35).setDepth(999);
        dbg.setVisible(!!window.JAR_SHOW_BODY_DEBUG);
        this.debugCircles.push(dbg);
      }
    }

    // Spatial hash for collision optimization (bucket by 30px columns)
    const buckets = {};
    for (const b of this.letterBodies) {
      const key = Math.floor(b.x / 30);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(b);
    }
  const leftBound = this.jarX - this.jarWidth/2 + 20;
  const rightBound = this.jarX + this.jarWidth/2 - 20;
  const topBound = this.jarY - this.jarHeight/2 + 20;
  const bottomBound = this.jarY + this.jarHeight/2 - 20;
    let allResting = true;
    for (const b of this.letterBodies) {
      if (b.resting) continue;
      // Gravity
  // Slightly reduced effective gravity for gentler stacking
  b.vy += (this.gravityY * 0.8) * dt; // slightly lower gravity for bigger bodies
      // Integrate
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Horizontal friction
      b.vx *= this.horizontalFriction;
      // Bounds collision - floor
      if (b.y >= bottomBound) {
        b.y = bottomBound;
        b.vy = -Math.abs(b.vy) * this.bounceCoeff * this.floorDamp;
        if (Math.abs(b.vy) < 20) { // threshold tuned for larger radius
          b.vy = 0;
          b.resting = true;
        }
      }
      // Side walls
      if (b.x <= leftBound) {
        b.x = leftBound;
        b.vx = Math.abs(b.vx) * this.bounceCoeff;
      } else if (b.x >= rightBound) {
        b.x = rightBound;
        b.vx = -Math.abs(b.vx) * this.bounceCoeff;
      }
      // Basic top clamp (rare)
      if (b.y < topBound - 160) b.y = topBound - 160;
      b.sprite.setPosition(b.x, b.y);
  // Sync debug circle position
  const dbg = this.debugCircles[this.letterBodies.indexOf(b)];
  if (dbg) dbg.setPosition(b.x, b.y);
      // Mild wobble/rotation proportional to velocity
      b.sprite.setRotation(b.vx * 0.002);
      if (!b.resting) allResting = false;

      // Inter-letter collisions (check neighbor buckets)
      const bKey = Math.floor(b.x / 30);
      for (const nk of [bKey-1, bKey, bKey+1]) {
        const list = buckets[nk];
        if (!list) continue;
        for (const o of list) {
          if (o === b) continue;
          // Simple circle collision
          const dx = o.x - b.x;
          const dy = o.y - b.y;
          const distSq = dx*dx + dy*dy;
          const minDist = (b.radius || 18) + (o.radius || 18);
          if (distSq > 0 && distSq < minDist*minDist) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            // Separate bodies
            b.x -= nx * overlap;
            b.y -= ny * overlap;
            o.x += nx * overlap;
            o.y += ny * overlap;
            // Exchange velocity component along normal (elastic-ish)
            const relVx = b.vx - o.vx;
            const relVy = b.vy - o.vy;
            const impulse = (relVx * nx + relVy * ny) * 0.42; // slightly reduced impulse for stability with larger bodies
            b.vx -= impulse * nx;
            b.vy -= impulse * ny;
            o.vx += impulse * nx;
            o.vy += impulse * ny;
            // Dampen slightly for stability
            b.vx *= 0.98; b.vy *= 0.98; o.vx *= 0.98; o.vy *= 0.98;
            // Add rotational flair based on impulse
            b.sprite.rotation += impulse * 0.01;
            o.sprite.rotation -= impulse * 0.01;
            // Resting check when supported by other body below (ny > 0 means o below b)
            if (!b.resting && ny > 0.55 && Math.abs(b.vy) < 24 && b.y < bottomBound - 10) { // ensure not falsely resting too high
              b.vy = 0; b.resting = true;
            }
            if (!o.resting && ny < -0.55 && Math.abs(o.vy) < 24 && o.y < bottomBound - 10) {
              o.vy = 0; o.resting = true;
            }
          }
        }
      }
    }
    // Support-based resting refinement: remove forced sand settling so letters stack in layers.
    // Re-evaluate resting status for bodies not on floor to ensure they have support beneath.
    for (const b of this.letterBodies) {
      if (!b.resting) continue;
      // Floor resting remains valid
      if (Math.abs(bottomBound - b.y) < 0.5) continue;
      // Check for at least one supporting resting body beneath with horizontal overlap.
      const r = b.radius || 18;
      const supported = this.letterBodies.some(o => o !== b && o.resting && o.y > b.y && (o.y - b.y) < (r + (o.radius||18) + 6) && Math.abs(o.x - b.x) < (r + (o.radius||18)) * 0.85);
      if (!supported) {
        // Remove resting so it can fall further until it finds support.
        b.resting = false;
        // Give slight downward velocity to resume falling.
        b.vy = Math.max(b.vy, 30);
      }
    }
    // Mark fully settled only when every body has valid support or floor contact.
    const allBodiesSupported = this.letterBodies.every(b => {
      if (!b.resting) return false;
      if (Math.abs(bottomBound - b.y) < 0.5) return true;
      const r = b.radius || 18;
      return this.letterBodies.some(o => o !== b && o.resting && o.y > b.y && (o.y - b.y) < (r + (o.radius||18) + 6) && Math.abs(o.x - b.x) < (r + (o.radius||18)) * 0.85);
    });
    if (allBodiesSupported && !this._settled) {
      this._settled = true;
      this.tweens.add({ targets: this.letterBodies.map(b => b.sprite), scale: { from: 1.03, to: 1 }, duration: 380, ease: 'Quad.Out' });
      // Update external total (could be same value, but refresh with potential formatting)
      const jarTotalEl = document.getElementById('jar-total');
      if (jarTotalEl) jarTotalEl.textContent = (window.t ? window.t('jar.total', { count: this.collectedLetters.length }) : `Total: ${this.collectedLetters.length}`);
    }
    // Update debug circles visibility if flag changed mid-frame
    if (this._lastDebugFlag !== window.JAR_SHOW_BODY_DEBUG) {
      this._lastDebugFlag = window.JAR_SHOW_BODY_DEBUG;
      this.refreshDebugBodiesVisibility();
    }
  }

  refreshDebugBodiesVisibility() {
    const show = !!window.JAR_SHOW_BODY_DEBUG;
    for (let i = 0; i < this.debugCircles.length; i += 1) {
      this.debugCircles[i].setVisible(show);
    }
  }

  shutdown() {
    const jarInfoEl = document.getElementById('jar-info');
    if (jarInfoEl) jarInfoEl.style.display = 'none';
  }

  destroy() {
    const jarInfoEl = document.getElementById('jar-info');
    if (jarInfoEl) jarInfoEl.style.display = 'none';
    super.destroy();
  }

  refreshFontFamily(newFamily) {
    for (const body of this.letterBodies) {
      if (body.sprite && body.sprite.setFontFamily) body.sprite.setFontFamily(newFamily);
    }
    window.GAME_FONT_FAMILY = newFamily;
  }
}
