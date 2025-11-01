# 🎮 Project Codename: Typewriter
### A Browser-Based Typing & Mouse Learning Adventure Game for Kids  
**Date:** {date.today()}

---

## 🌟 Overview
**Typewriter** is a fun, browser-based collection of mini-games designed to help kids improve typing and mouse skills.  
Each mini-game blends learning objectives with engaging gameplay mechanics — from letter recognition to full sentence typing.

The game follows a “mini-world” structure similar to *Mario Party*, where players progress through themed levels with unique challenges.

---

## 🧩 Core Concept

| Element | Description |
|----------|-------------|
| **Platform** | Web-based (browser, desktop & tablet friendly) |
| **Genre** | Educational / Mini-Game Collection |
| **Target Age** | 5–12 years old |
| **Game Modes** | Action Mode ("Type Defenders") & Peace Mode ("Garden Growers") |
| **Progression** | Unlockable levels, achievements, and visual rewards |
| **Tone & Style** | Friendly, colorful, encouraging feedback, soft animations |

---

## 🪄 Learning Progression

| Stage | Skill Focus | Example Mini-Game |
|--------|--------------|------------------|
| 1. Letter Discovery | Key recognition, finger placement | “Letter Garden” – type the letter on each flower to make it bloom. |
| 2. Reflex Typing | Reaction time, letter association | “Letter Attack” – letters fall from the sky; type them before they hit the ground. |
| 3. Word Building | Spelling, rhythm | “Word Bridge” – type words to build a bridge across a river. |
| 4. Mouse + Keyboard Combo | Coordination | “Bubble Rescue” – click to move, type letters to pop the right bubbles. |
| 5. Sentence Flow | Context typing | “Story Sprinter” – type short phrases to help characters progress through a storybook world. |

---

## ⚔️ Action Mode – “Type Defenders”
Defend your world from waves of enemies (letters or words).  
Each correct keystroke fires a projectile. Complete words to activate special powers.

**Mechanics:**
- Type letters before they reach you.
- Combo system for accuracy streaks.
- Power-ups: shields, auto-fire boosts, slow-motion time.

**Learning Goal:** Speed, accuracy, hand-eye coordination.

---

## 🌸 Peace Mode – “Garden Growers”
A calm, creative environment where typing makes flowers grow, animals appear, and colors return to the world.

**Mechanics:**
- No time pressure; focus on exploration.
- Type words to plant seeds or grow trees.
- Earn decorations and customize your garden.

**Learning Goal:** Recognition, spelling, and confidence building.

---

## 🧠 Educational Features
- **Adaptive Difficulty:** Adjusts speed and word complexity automatically.  
- **Mini Lessons:** Quick letter drills before each challenge.  
- **Encouragement:** Voice feedback and progress stars.  
- **Rewards:** Unlock outfits, pets, stickers, and garden decor.

---

## 🖱️ Mouse-Focused Mini-Games
1. **Catch the Letter** – Click moving letters to catch the right ones.  
2. **Paint the Word** – Trace letters using the mouse to reveal colors.  
3. **Keyboard Builder** – Drag missing keys back to the right spot.

---

## 🎨 Art & UX
- 2D vector visuals (soft pastel color palette).  
- Whimsical sound design (clicks, chimes, laughter).  
- Simple, clean UI with big buttons.  
- Accessibility: dyslexia-friendly fonts, high contrast mode, large text options.

---

## 🧰 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Game Engine** | Phaser.js (2D HTML5 game framework) |
| **Frontend** | HTML5, CSS3 (light utility classes), plain JavaScript (HTML-first; future Svelte possible) |
| **Animation** | WebGL / Canvas rendering |
| **Audio** | WebAudio API |
| **Data Storage** | Firebase Realtime DB or LocalStorage |
| **Deployment** | Netlify / Vercel |
| **Version Control** | Git + GitHub |

---

## 🧩 Future Extensions
- Multiplayer typing duels (real-time via WebSocket).  
- Teacher/Parent dashboard for tracking progress.  
- Daily word challenges.  
- Thematic seasonal events (e.g., Halloween letters, Winter Garden).

---

## 🪄 Next Steps
1. Design prototype of **Letter Attack** in Phaser.js.  
2. Create static UI mockups (main menu, level select) in plain HTML/CSS.  
3. Implement first typing logic & collision detection.  
4. Add sound and animation feedback.  
5. Build progress save/load system.

## ▶️ Running the Prototype (when present)
Open `index.html` directly in a browser or serve locally for clean module loading:

```
npx serve .
```

Adjust difficulty by editing `window.LETTER_SPEED_MULTIPLIER` in `index.html`.

### Character Set Customization
Edit `src/game/config/characters.json` to change which characters spawn (`"characters": "ABC123!?"`).
Spawning is case-insensitive for matching; uppercase displays still match lowercase key presses.

### Difficulty Configuration
Now uses independent toggles for **Speed** and **Amount**. Edit `src/game/config/difficulty.json`:
- `speedOptions`: each has a `speedMultiplier` (affects fall velocity).
- `amountOptions`: each has a `spawnIntervalMs` (lower = more letters).
- `defaults`: pre-selected speed & amount.

Overlay controls:
- Speed keys: 1 = Normal, 2 = Fast, 3 = Insane
- Amount keys: Q = Normal, W = Many, E = Horde
- Press Enter or click Start once both are highlighted.

Selected values are applied globally via `window.LETTER_SPEED_MULTIPLIER` and `window.SPAWN_INTERVAL_MS`.

---

**Codename:** *Typewriter*  
**Tagline:** *Learn. Type. Play.*  