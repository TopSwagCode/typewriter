// Placeholder for future HTML menu logic.
// Expected usage later:
// import { initMenu, renderLevelList } from './ui/menu.js'
// Keep shallow DOM structure for easy Svelte migration.

export function initMenu(rootEl) {
  if (!rootEl) return;
  rootEl.innerHTML = '<h2>Menu Placeholder</h2><p>Prototype running. More soon.</p>';
}

export function renderLevelList(levels = []) {
  return levels.map(l => `<div class="level">${l.name}</div>`).join('');
}
