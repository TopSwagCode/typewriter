# 🤖 AI Contributor Instructions for Typewriter

These guidelines help AI coding agents contribute effectively to this early-stage project. Keep changes minimal, explicit, and aligned with the README vision.

## Project Snapshot
- Playable prototype: `LetterAttack` scene in Phaser with falling letters, scoring, lives, and game over overlay.
- Stack: Phaser 3 (CDN), plain HTML/CSS for overlays/menu, modular ES modules for systems, LocalStorage for lightweight persistence.
- Framework deferral: DO NOT add React/Vue/etc; keep HTML shallow to allow future Svelte adoption.
- Game Modes (planned): Action ("Type Defenders") & Peace ("Garden Growers") plus typing/mouse mini-games.

### Recently Implemented (keep in sync)
- Separate `gameplay.json` for `startingLives` and `gameOverDelays` (explosion + post delay) distinct from difficulty.
- Delayed game over sequence: remaining active letters shatter in staggered intervals before end screen appears.
- Expanded i18n: languages `en, da, de, fr, es, it, no, sv` with dropdown selector + flag, persisted in `tw_lang`.
- Per-language character sets (`characters.json`) applied on load -> globals `CHAR_SET_RAW` / `CHAR_SET`.
- Input filtering: ignores control/navigation keys (Escape, Enter, arrows, etc.) so no accidental misses.
- Wrong key penalty toggle (life loss on/off) respected; life loss only occurs if flag enabled.
- Pause system: `Escape` toggles pause (if not game over) showing overlay with Resume & Back to Menu.
- Back to Menu buttons (pause + game over) destroy Phaser instance and restore difficulty selection overlay.
- Miss flash visual feedback (`triggerMissFlash`) on wrong valid key: brief tinted full-screen rectangle fade.
- Game instance stored (`phaserGame`) for safe destruction when returning to menu.

## Near-Term Implementation Priorities (from README "Next Steps")
1. Prototype mini-game: Letter Attack in Phaser (core typing loop + falling letters + collision/removal).
2. Static UI mockups: Main Menu, Level Select using plain HTML partials + lightweight CSS.
3. Typing logic & collision: Key event handling, mapping characters to active entities, scoring.
4. Feedback layer: Simple sound (WebAudio) + basic animations (Phaser tweens).
5. Persistence: Lightweight save (LocalStorage JSON) until Firebase is introduced.

## Code Structure (Proposed — create as you implement, keep modular)
```
src/
  game/
    scenes/ (Phaser Scene classes: Boot, LetterAttack, Garden)
    input/ (typing handlers, adaptive difficulty variable + events)
    systems/ (spawn, scoring, power-ups)
    config/ (JSON configs: difficulty.json (spawn/speed), gameplay.json (lives, game-over timings), characters.json)
  ui/ (HTML templates + tiny JS controllers: menu.js, levelSelect.js)
  assets/ (placeholder images, audio)
  state/ (persistence adapter: localStorage.js, future firebase.js)
```
Only add directories when implementing related features; avoid speculative empty trees.

## Conventions
- Prefer small, single-responsibility modules (e.g., `spawnLetters.js` separate from scoring logic).
- Configuration (difficulty variable, word lists) in plain JSON under `src/game/config/`.
- Use semantic names matching README terminology ("LetterAttack", "TypeDefenders", "GardenGrowers").
- Fallback-first persistence: LocalStorage adapter with future Firebase behind an interface (`save(data)`, `load()`).
- Keep assets lightweight placeholders (colored rectangles / basic sounds) until art pipeline defined.
- Keep DOM structure shallow (ids/data-* attributes) so swapping to Svelte later is straightforward.

## Menus & Future Svelte Migration
- Implement menus as static `index.html` + fragment templates (e.g., `templates/menu.html`).
- Attach minimal JS controllers (e.g., `ui/menu.js`) that query elements once, then update text/content via functions.
- Avoid global mutation; export init + render functions (`initMenu(rootEl)`, `renderLevelList(levels)`).
- No JSX or framework-specific patterns; keep separation of state vs DOM updates.

## Typing Mechanics (Letter Attack MVP)
- Letter entity shape currently: `{ id, char, charLower, x, y, speed, wobblePhase, wobbleAmp, bouncePhase?, bounceAmp?, tiltAmpDeg?, state }` where `state ∈ active|hit|missed`.
- Key handling: on `keydown`, lowercase match finds first visible active letter (`y >= 0`) with `charLower` equal to key.
- Hit flow: mark `hit`, increment score, spawn shatter particles, floating +1 score popup, camera micro shake, remove letter.
- Miss flow (wrong key): increments miss counter only for valid playable characters in current language set; optional life loss depending on menu selection (see Wrong Key Penalty below); aggressive shake + miss flash overlay.
- Falling logic: off-screen spawn (above top), drift toward center, sinusoidal wobble, speed-scaled bounce, small tilt.
- Difficulty now split into two independent toggles: Speed (normal|fast|insane) affects `window.LETTER_SPEED_MULTIPLIER`; Amount (normal|many|horde) affects `window.SPAWN_INTERVAL_MS` (spawn frequency).
## Difficulty & Penalty Configuration
- Difficulty config: `src/game/config/difficulty.json` structure:
  ```json
  {
    "defaults": { "speed": "normal", "amount": "normal" },
    "speedOptions": { "normal": { "speedMultiplier": 1 }, "fast": { "speedMultiplier": 1.6 }, "insane": { "speedMultiplier": 2.2 } },
    "amountOptions": { "normal": { "spawnIntervalMs": 1200 }, "many": { "spawnIntervalMs": 900 }, "horde": { "spawnIntervalMs": 600 } }
  }
  ```
- Gameplay tuning (non-difficulty): `src/game/config/gameplay.json` holds:
  - `startingLives`
  - `gameOverDelays` (`explosionIntervalMs`, `postExplosionsDelayMs`)
  These are loaded separately in `main.js` and exposed via globals `STARTING_LIVES`, `GAMEOVER_EXPLOSION_INTERVAL_MS`, `GAMEOVER_POST_EXPLOSIONS_DELAY_MS`.
- Player selects Speed (1/2/3) and Amount (Q/W/E) before starting; Start disabled until both chosen.
- Wrong Key Penalty options: Life Loss (😈) or No Life Loss (😇) with keyboard shortcuts L / O; sets `window.LOSE_LIFE_ON_WRONG_KEY`.
- Persistence: last selections saved to LocalStorage keys: `tw_last_speed`, `tw_last_amount`, `tw_last_life` and reloaded on page visit.

## Visual & Feedback Systems
- Wobble, bounce, tilt updates each frame relative to letter speed for liveliness.
- Shatter effect: particles spawned on letter hit (`createShatter`).
- Score popup: floating `+1` text for each hit (`createScorePopup`).
- Camera shake: mild on hit, stronger on wrong key.
- Miss flash overlay: brief tinted flash on wrong key via `scene.triggerMissFlash()` (full-screen rectangle tween).
- Delayed game over: remaining letters explode (shatter) sequentially before end screen reveals score/best.
- Pause overlay: shows when `Escape` toggled (unless game over); includes Resume & Back to Menu.
- Hearts: Phaser text hearts (❤) represent lives; shatter/GFX on loss; game over overlay displays score + best.
- Fast tier halo (planned earlier) may be reintroduced; verify before modifying.

## Persistence
- LocalStorage used for: best score (`localStorage.js` adapter), difficulty selections (`tw_last_*` keys), language (`tw_lang`), and wrong key life penalty choice.
- When adding new persistent settings, follow pattern: read -> validate against config -> apply -> write.

## Character Sets per Language
- File `src/game/config/characters.json` now maps languages to character sets:
  ```json
  {
    "defaultLanguage": "en",
    "sets": {
      "en": "QWERTYUIOPASDFGHJKLZXCVBNM",
      "da": "QWERTYUIOPÅASDFGHJKLÆØZXCVBNM",
      "de": "QWERTZUIOPÄASDFGHJKLÖÜYXCVBNM",
      "fr": "AZERTYUIOPQSDFGHJKLMWXCVBNÉÈÀÇÙÔÊÎÂ",
      "es": "QWERTYUIOPASDFGHJKLÑZXCVBNM",
      "it": "QWERTYUIOPASDFGHJKLZXCVBNM",
      "no": "QWERTYUIOPÅASDFGHJKLØÆZXCVBNM",
      "sv": "QWERTYUIOPÅASDFGHJKLÖÄZXCVBNM"
    }
  }
  ```
- On language load (`tw_lang`), the appropriate set is applied to globals `CHAR_SET_RAW` / `CHAR_SET` (lowercased for matching).
- Fallback: if a language key is missing, `defaultLanguage` set is used.
- To add a new language: append to `sets`, add translation JSON file, and ensure language appears in i18n supported array.

## Internationalization (i18n)
- Translation files under `src/i18n/` (`en.json`, `da.json`, `de.json`, `fr.json`, `es.json`, `it.json`, `no.json`, `sv.json`).
- Elements annotated with `data-i18n="key.path"` auto-populated at load.
- Global `t(key, vars)` helper replaces `{var}` placeholders.
- User language stored in `localStorage` key `tw_lang`; falls back to browser language then English.
- When adding new UI text: use a key (e.g., `menu.newFeature.title`), add to all language JSON files, and set a sensible English default.

## UI Selection Effects
- Selected option buttons (`.speed-btn`, `.amount-btn`, `.life-btn`) receive `selected` class with pulse glow + outline.
- Wobble-on-press effect can be triggered when adding interactive enhancements (if reinstated ensure class toggling doesn’t conflict with pulse animation).

## Extending Features Safely
- Add new difficulty dimensions by extending `difficulty.json` (e.g., `accuracyOptions`) and exposing new menu group (keep similar pattern: data-* attribute, persistence key `tw_last_*`).
- Introduce adaptive difficulty by adjusting `window.LETTER_SPEED_MULTIPLIER` and `window.SPAWN_INTERVAL_MS` mid-game—ensure UI reflects post-game updated baseline but do not mutate original config JSON at runtime.
- If adding sounds: create `assets/` subfolder and a tiny `soundSystem.js`; keep preload minimal.

## Wrong Key Handling Changes
- Life loss now conditional on `window.LOSE_LIFE_ON_WRONG_KEY` (set at start only). Do NOT change mid-run without clear UX update.
- Miss counter increments for both wrong key and letters reaching bottom; keep separate life decrement logic wrapped by flag.
 - Ignore list ensures non-character keys (escape, arrows, function keys, modifiers) never count as misses.

## File Touch Points
- Primary gameplay: `src/game/scenes/LetterAttackScene.js`
- Input: `src/game/input/typingInput.js` (contains conditional life loss and miss logic).
- Pause & miss flash: implemented inside `LetterAttackScene` (`setPaused`, `togglePause`, `triggerMissFlash`).
- Spawning: `src/game/systems/spawnLetters.js` (off-screen spawn + motion attributes).
- Effects: `src/game/systems/shatterEffect.js`, `src/game/systems/scorePopup.js`.
- Persistence: `src/state/localStorage.js` + inline LocalStorage usage in `main.js` for difficulty selections.
- Menu logic currently embedded in `src/main.js` (can be modularized later).
- Game instance lifecycle: managed in `main.js` (`phaserGame` reference, `showStartMenu()` destroys before restart).

## Update Guidance (Recap)
- When altering difficulty: update both JSON and UI overlay; reflect defaults and persistence.
- Maintain backward compatibility: if a new config key missing, fallback gracefully to defaults.
- Keep changes modular: avoid mixing UI and scene logic; new systems belong in `src/game/systems/`.
- For new overlays (pause/settings), follow current pattern: static HTML + scene method to toggle visibility, avoid deep DOM mutation.

## What NOT to Modify Without Request
- Do not introduce build tooling, bundlers, or TypeScript yet.
- Avoid replacing HTML-driven overlay with canvas scene until controller support required.
- Leave multiplayer, analytics, and Firebase integration deferred.

## Clarification Triggers (Updated)
- Adding new persistent user settings.
- Modifying life penalty behavior or score formula.
- Introducing performance optimizations impacting spawn timing accuracy.
- Changing pause behavior (e.g., pausing during game over sequence or adding countdown timer).
- Altering Back to Menu flow (e.g., partial reset vs full Phaser destroy).

---
Keep these instructions synced whenever new UI groups, persistence keys, or game feedback systems are added.

## Quality & Scope Control
- No frameworks until needed: if React not scaffolded, start with plain HTML/CSS for menus.
- Provide minimal runnable demo before adding optimization layers.
- Defer advanced features in README (multiplayer, dashboards) unless explicitly requested.

## Suggested Initial Commands (once code exists)
- Start lightweight static server: `npx serve` (or any simple HTTP server) from project root.
- Quick asset sanity: open `index.html` in browser, confirm Phaser loads and one sound/font asset preload succeeds.

## External Integrations
- Phaser: use CDN script initially (`<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js"></script>`) until build tooling added.
- Firebase: defer; only introduce when LocalStorage insufficient.

## PR / Change Guidance
- When adding new folder or adapter, append a concise bullet here.
- Update README when a playable mini-game or new system (scoring, persistence) lands.
- Avoid adding dependencies; prefer vanilla JS until build tooling decision.

## What NOT to Do Now
- No multiplayer logic, auth flows, or complex data models.
- Don't introduce TypeScript unless requested.
- Avoid large asset commits or proprietary content.

## Ask for Clarification When
- Deciding to introduce build tooling or Svelte migration timing.
- Establishing difficulty scaling parameters (hit thresholds, speed increments).
- Defining or expanding persistence schema (versioning, multiple profiles).

---
Refine these instructions as the codebase grows; keep them concise and grounded in actual files.
