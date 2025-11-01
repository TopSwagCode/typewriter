const KEY = 'typewriter_save_v1';

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function updateScoreIfHigher(hits) {
  const current = load() || {};
  const best = current.bestHits || 0;
  if (hits > best) {
    current.bestHits = hits;
    save(current);
  }
  return current.bestHits;
}
