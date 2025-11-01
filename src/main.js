import LetterAttackScene from './game/scenes/LetterAttackScene.js';

const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  backgroundColor: '#1e2530',
  parent: 'game-root',
  scene: [LetterAttackScene],
};

async function loadCharacterConfig() {
  try {
    const res = await fetch('./src/game/config/characters.json');
    const data = await res.json();
    window.CHARSET_CONFIG = data;
    // Defer actual set selection until language known.
  } catch (e) {
    window.CHARSET_CONFIG = { defaultLanguage: 'en', sets: { en: 'asdfjkl;ghierutywmn' } };
  }
}

async function loadDifficultyConfig() {
  try {
    const res = await fetch('./src/game/config/difficulty.json');
    const data = await res.json();
    window.DIFFICULTY_CONFIG = data;
  } catch (e) {
    // Fallback new-format config
    window.DIFFICULTY_CONFIG = {
      defaults: { speed: 'normal', amount: 'normal' },
      speedOptions: {
        normal: { speedMultiplier: 1.0 },
        fast: { speedMultiplier: 1.6 },
        insane: { speedMultiplier: 2.2 }
      },
      amountOptions: {
        normal: { spawnIntervalMs: 1200 },
        many: { spawnIntervalMs: 900 },
        horde: { spawnIntervalMs: 600 }
      }
    };
  }
}

async function loadGameplayConfig() {
  try {
    const res = await fetch('./src/game/config/gameplay.json');
    const data = await res.json();
    window.GAMEPLAY_CONFIG = data;
    // Expose hit sound pitch randomization range (+/-) if defined
    const pitchVar = (data.hitSound && typeof data.hitSound.pitchRandomization === 'number') ? data.hitSound.pitchRandomization : 0;
    window.HIT_SOUND_PITCH_RANDOMIZATION = pitchVar; // e.g., 0.15 -> random rate in [0.85,1.15]
  } catch (e) {
    window.GAMEPLAY_CONFIG = {
      startingLives: 3,
      gameOverDelays: { explosionIntervalMs: 70, postExplosionsDelayMs: 250 }
    };
    window.HIT_SOUND_PITCH_RANDOMIZATION = 0;
  }
}

function applySelections(speedKey, amountKey) {
  const cfg = window.DIFFICULTY_CONFIG;
  const speedCfg = (cfg.speedOptions && cfg.speedOptions[speedKey]) || cfg.speedOptions[cfg.defaults.speed];
  const amountCfg = (cfg.amountOptions && cfg.amountOptions[amountKey]) || cfg.amountOptions[cfg.defaults.amount];
  window.SELECTED_SPEED = speedKey;
  window.SELECTED_AMOUNT = amountKey;
  window.LETTER_SPEED_MULTIPLIER = speedCfg.speedMultiplier;
  window.SPAWN_INTERVAL_MS = amountCfg.spawnIntervalMs;
}

window.addEventListener('load', async () => {
  await loadCharacterConfig();
  await loadDifficultyConfig();
  await loadGameplayConfig();

  const diffOverlay = document.getElementById('difficulty-select');
  const speedButtons = Array.from(document.querySelectorAll('.speed-btn'));
  const amountButtons = Array.from(document.querySelectorAll('.amount-btn'));
  const lifeButtons = Array.from(document.querySelectorAll('.life-btn'));
  const langMenu = document.getElementById('lang-menu');
  const langTrigger = document.getElementById('lang-trigger');
  const langTriggerFlag = document.getElementById('lang-trigger-flag');
  const langTriggerLabel = document.getElementById('lang-trigger-label');
  const startBtn = document.getElementById('start-btn');
  const backMenuBtn = document.getElementById('back-menu-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const pauseMenuBtn = document.getElementById('pause-menu-btn');
  const pauseOverlay = document.getElementById('pause-overlay');
  const sfxVolumeSlider = document.getElementById('sfx-volume');
  const sfxVolumeValueEl = document.getElementById('sfx-volume-value');

  // Sound effects volume (0..1) - default from gameplay config or 0.8
  let sfxVolume = (window.GAMEPLAY_CONFIG && typeof window.GAMEPLAY_CONFIG.soundEffectsVolumeDefault === 'number') ? window.GAMEPLAY_CONFIG.soundEffectsVolumeDefault : 0.8;
  // Load persisted volume
  try {
    const pv = localStorage.getItem('tw_sfx_volume');
    if (pv !== null) {
      const num = parseFloat(pv);
      if (!Number.isNaN(num)) sfxVolume = Math.min(1, Math.max(0, num));
    }
  } catch (_) {}
  window.SFX_VOLUME = sfxVolume;
  function updateSfxSliderUI() {
    if (sfxVolumeSlider) sfxVolumeSlider.value = Math.round(window.SFX_VOLUME * 100);
    if (sfxVolumeValueEl) sfxVolumeValueEl.textContent = `${Math.round(window.SFX_VOLUME * 100)}%`;
  }
  updateSfxSliderUI();

  let phaserGame = null; // hold reference for scene access

  let selectedSpeed = null;
  let selectedAmount = null;
  let selectedLife = 'on'; // on = lose life, off = no life loss
  let gameStarted = false;
  let currentLang = 'en';

  async function loadLanguage(lang) {
    const supported = ['en','da','de','fr','es','it','no','sv'];
    if (!supported.includes(lang)) lang = 'en';
    try {
      const res = await fetch(`./src/i18n/${lang}.json`);
      const translations = await res.json();
      window.I18N = translations;
      currentLang = lang;
      localStorage.setItem('tw_lang', currentLang);
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = translations[key] || key;
        el.textContent = value;
      });
      // Select character set tied to language
      const cCfg = window.CHARSET_CONFIG || { defaultLanguage: 'en', sets: { en: 'asdfjkl;ghierutywmn' } };
      const langKey = cCfg.sets[lang] ? lang : cCfg.defaultLanguage;
      const rawSet = (cCfg.sets[langKey] || '').trim();
      window.CHAR_SET_RAW = rawSet || 'asdfjkl;ghierutywmn';
      window.CHAR_SET = window.CHAR_SET_RAW.toLowerCase();
    } catch (e) {
      // fallback minimal
      window.I18N = {};
    }
  }

  window.t = function(key, vars = {}) {
    const translations = window.I18N || {};
    let out = translations[key] || key;
    Object.keys(vars).forEach(k => {
      out = out.replace(new RegExp(`{${k}}`, 'g'), vars[k]);
    });
    return out;
  };

  function persist() {
    try {
      localStorage.setItem('tw_last_speed', selectedSpeed || '');
      localStorage.setItem('tw_last_amount', selectedAmount || '');
      localStorage.setItem('tw_last_life', selectedLife || 'on');
      localStorage.setItem('tw_lang', currentLang || 'en');
      localStorage.setItem('tw_sfx_volume', String(window.SFX_VOLUME));
    } catch (_) { /* ignore quota */ }
  }

  function updateButtonStates() {
    if (langMenu) {
      langMenu.querySelectorAll('.lang-option').forEach(opt => {
        if (opt.dataset.lang === currentLang) opt.classList.add('selected'); else opt.classList.remove('selected');
      });
      // Update trigger label
      if (langTriggerLabel) {
        const keyMap = {
          en: 'menu.language.english',
          da: 'menu.language.danish',
          de: 'menu.language.german',
          fr: 'menu.language.french',
          es: 'menu.language.spanish',
          it: 'menu.language.italian',
          no: 'menu.language.norwegian',
          sv: 'menu.language.swedish'
        };
        const labelKey = keyMap[currentLang] || 'menu.language.english';
        langTriggerLabel.textContent = window.t ? window.t(labelKey) : currentLang;
      }
      if (langTriggerFlag) {
        const flagMap = { en: '🇬🇧', da: '🇩🇰', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', no: '🇳🇴', sv: '🇸🇪' };
        langTriggerFlag.textContent = flagMap[currentLang] || '🇬🇧';
      }
    }
    speedButtons.forEach(b => {
      if (b.dataset.speed === selectedSpeed) b.classList.add('selected'); else b.classList.remove('selected');
    });
    amountButtons.forEach(b => {
      if (b.dataset.amount === selectedAmount) b.classList.add('selected'); else b.classList.remove('selected');
    });
    lifeButtons.forEach(b => {
      if (b.dataset.life === selectedLife) b.classList.add('selected'); else b.classList.remove('selected');
    });
    const ready = selectedSpeed && selectedAmount;
    if (startBtn) {
      startBtn.disabled = !ready;
      startBtn.style.opacity = ready ? '1' : '0.5';
    }
  }

  function startGame() {
    if (gameStarted || !selectedSpeed || !selectedAmount) return;
    applySelections(selectedSpeed, selectedAmount);
    window.LOSE_LIFE_ON_WRONG_KEY = (selectedLife === 'on');
  window.STARTING_LIVES = (window.GAMEPLAY_CONFIG && window.GAMEPLAY_CONFIG.startingLives) ? window.GAMEPLAY_CONFIG.startingLives : 3;
  // Game over sequence delay configuration (from gameplay config)
  const god = (window.GAMEPLAY_CONFIG && window.GAMEPLAY_CONFIG.gameOverDelays) || {};
    window.GAMEOVER_EXPLOSION_INTERVAL_MS = god.explosionIntervalMs || 70;
    window.GAMEOVER_POST_EXPLOSIONS_DELAY_MS = god.postExplosionsDelayMs || 250;
    gameStarted = true;
    if (diffOverlay) diffOverlay.style.display = 'none';
    phaserGame = new Phaser.Game(config); // eslint-disable-line new-cap
  }

  function showStartMenu() {
    // Destroy existing game if any
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }
    gameStarted = false;
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    const endScreen = document.getElementById('end-screen');
    if (endScreen) endScreen.style.display = 'none';
    if (diffOverlay) diffOverlay.style.display = 'flex';
    updateButtonStates();
  }

  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => { selectedSpeed = btn.dataset.speed; updateButtonStates(); persist(); });
  });
  amountButtons.forEach(btn => {
    btn.addEventListener('click', () => { selectedAmount = btn.dataset.amount; updateButtonStates(); persist(); });
  });
  lifeButtons.forEach(btn => {
    btn.addEventListener('click', () => { selectedLife = btn.dataset.life; updateButtonStates(); persist(); });
  });
  if (langTrigger) {
    langTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const menu = langMenu;
      if (!menu) return;
      menu.classList.toggle('open');
      const expanded = menu.classList.contains('open');
      langTrigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!langTrigger) return;
      if (!langTrigger.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.classList.remove('open');
        langTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  if (langMenu) {
    langMenu.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        currentLang = opt.dataset.lang;
        langMenu.classList.remove('open');
        if (langTrigger) langTrigger.setAttribute('aria-expanded', 'false');
        await loadLanguage(currentLang);
        updateButtonStates();
        persist();
      });
    });
  }
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (backMenuBtn) backMenuBtn.addEventListener('click', showStartMenu);
  if (pauseMenuBtn) pauseMenuBtn.addEventListener('click', showStartMenu);
  if (resumeBtn) resumeBtn.addEventListener('click', () => {
    if (!phaserGame) return;
    const scene = phaserGame.scene.keys['LetterAttack'];
    if (scene && scene.setPaused) scene.setPaused(false);
  });
  if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', () => {
      const raw = parseInt(sfxVolumeSlider.value, 10);
      const vol = Math.min(100, Math.max(0, raw)) / 100;
      window.SFX_VOLUME = vol;
      updateSfxSliderUI();
      // Update existing scene sounds if active
      if (phaserGame) {
        const scene = phaserGame.scene.keys['LetterAttack'];
        if (scene && scene.updateSfxVolume) scene.updateSfxVolume(vol);
      }
      persist();
    });
  }

  window.addEventListener('keydown', (e) => {
    let changed = false;
  if (e.key.toLowerCase() === 'g') { currentLang = 'en'; changed = true; loadLanguage(currentLang); }
  if (e.key.toLowerCase() === 'h') { currentLang = 'da'; changed = true; loadLanguage(currentLang); }
    if (e.key === '1') { selectedSpeed = 'normal'; changed = true; }
    if (e.key === '2') { selectedSpeed = 'fast'; changed = true; }
    if (e.key === '3') { selectedSpeed = 'insane'; changed = true; }
    if (e.key.toLowerCase() === 'q') { selectedAmount = 'normal'; changed = true; }
    if (e.key.toLowerCase() === 'w') { selectedAmount = 'many'; changed = true; }
    if (e.key.toLowerCase() === 'e') { selectedAmount = 'horde'; changed = true; }
    if (e.key.toLowerCase() === 'l') { selectedLife = 'on'; changed = true; }
    if (e.key.toLowerCase() === 'o') { selectedLife = 'off'; changed = true; }
    if (changed) { updateButtonStates(); persist(); }
    if (e.key === 'Enter') startGame();
    if (e.key === 'Escape') {
      if (!phaserGame) return;
      const scene = phaserGame.scene.keys['LetterAttack'];
      if (scene && !scene.gameOver) {
        scene.togglePause();
      }
    }
  });

  // Pre-select defaults to reduce friction
  const defaults = window.DIFFICULTY_CONFIG.defaults || { speed: 'normal', amount: 'normal' };
  // Load persisted selections if valid
  try {
    const ps = localStorage.getItem('tw_last_speed');
    const pa = localStorage.getItem('tw_last_amount');
    const pl = localStorage.getItem('tw_last_life');
    const langPersist = localStorage.getItem('tw_lang');
    if (ps && window.DIFFICULTY_CONFIG.speedOptions[ps]) selectedSpeed = ps;
    if (pa && window.DIFFICULTY_CONFIG.amountOptions[pa]) selectedAmount = pa;
    if (pl && (pl === 'on' || pl === 'off')) selectedLife = pl;
    if (langPersist) currentLang = langPersist;
  } catch (_) { /* ignore */ }
  if (!selectedSpeed) selectedSpeed = defaults.speed;
  if (!selectedAmount) selectedAmount = defaults.amount;
  if (!selectedLife) selectedLife = 'on';
  if (!currentLang) currentLang = (navigator.language || 'en').split('-')[0];
  await loadLanguage(currentLang);
  persist();
  updateButtonStates();
});
