function getLetters() {
  const raw = (window.CHAR_SET_RAW || 'asdfjkl;ghierutywmn');
  return raw.split('').filter(c => c.trim().length > 0);
}

const SPEED_TIERS = [
  { name: 'slow',   min: 50,  max: 70,  color: '#6ee7b7', wobbleBase: 6,  bounceAmp: 2 },
  { name: 'medium', min: 80,  max: 110, color: '#fbbf24', wobbleBase: 8,  bounceAmp: 4 },
  { name: 'fast',   min: 120, max: 160, color: '#f87171', wobbleBase: 11, bounceAmp: 6 },
];
let nextId = 1;

export function createLetterSpawner(scene, collection) {
  function spawn() {
  const letters = getLetters();
  const char = letters[Math.floor(Math.random() * letters.length)];
  const x = 40 + Math.random() * (scene.game.config.width - 80);
  const y = -40 - Math.random() * 60; // start above viewport (-40 to -100)
    // Pick a tier (weighted equally for now)
    const tier = SPEED_TIERS[Math.floor(Math.random() * SPEED_TIERS.length)];
    const speed = tier.min + Math.random() * (tier.max - tier.min);
    const appliedFamily = (window.GAME_FONT_FAMILY || 'JetBrainsMono');
    const textObj = scene.add.text(x, y, char, {
      fontFamily: appliedFamily,
      fontSize: '32px',
      color: tier.color,
    }).setOrigin(0.5, 0.5).setAlpha(0);
    // Fade in as it enters viewport
    scene.tweens.add({
      targets: textObj,
      alpha: 1,
      duration: 400,
      ease: 'Quadratic.Out'
    });

    const wobblePhase = Math.random() * Math.PI * 2;
    // Speed-scaled wobble: base from tier plus small random variance
    const wobbleAmp = tier.wobbleBase + Math.random() * 4; // widen range slightly per speed tier
    const tiltAmpDeg = 6 + Math.random() * 6; // 6-12 degrees side tilt
    const bouncePhase = Math.random() * Math.PI * 2;
    const bounceAmp = tier.bounceAmp; // vertical bob amplitude in px
  const charLower = char.toLowerCase();
  const letter = { id: nextId++, char, charLower, x, y, speed, tier: tier.name, color: tier.color, state: 'active', textObj, wobblePhase, wobbleAmp, tiltAmpDeg, bouncePhase, bounceAmp, fontFamily: appliedFamily };
    collection.push(letter);
  }

  return { spawn };
}
