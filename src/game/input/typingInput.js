import { createShatter } from '../systems/shatterEffect.js';
import { createScorePopup } from '../systems/scorePopup.js';

export function initTypingInput(scene, letters, scoreSystem) {
  scene.input.keyboard.on('keydown', (event) => {
    const rawKey = event.key;
    const key = rawKey.toLowerCase();
    // Ignore control / navigation / modifier keys so they don't produce misses.
    const ignoreKeys = [
      'shift','control','ctrl','alt','meta','escape','esc','tab','capslock','enter','backspace','delete','dead','arrowleft','arrowright','arrowup','arrowdown','pageup','pagedown','home','end','fn'
    ];
    if (ignoreKeys.includes(key)) return;
    // Only treat as miss if key is a single visible character and exists in configured character set
    const charSet = (window.CHAR_SET || '').split('');
    const isValidChar = key.length === 1 && charSet.includes(key);
    // find first active matching letter
    const target = letters.find(l => l.state === 'active' && l.charLower === key && l.y >= 0);
    if (target) {
      target.state = 'hit';
      scoreSystem.registerHit();
      if (scene.hitLetters) scene.hitLetters.push(target.charLower);
      createShatter(scene, target.textObj);
      createScorePopup(scene, target.textObj.x, target.textObj.y, 1);
      if (scene.playHitSound) scene.playHitSound();
      // Tiny screen shake for feedback
      scene.cameras.main.shake(450, 0.002); // duration ms, intensity
      target._fading = true;
      target.textObj.destroy();
      scene.updateHud();
    } else if (isValidChar) {
      // Only register miss for valid playable characters
      if (!scene.gameOver) {
        scoreSystem.registerMiss();
        if (window.LOSE_LIFE_ON_WRONG_KEY === undefined || window.LOSE_LIFE_ON_WRONG_KEY) {
          scene.loseLife(true);
        }
        if (scene.playErrorSound) scene.playErrorSound();
        scene.cameras.main.shake(500, 0.005);
        scene.triggerMissFlash();
        scene.updateHud();
      }
    }
  });
}
