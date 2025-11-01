export function createScoreSystem() {
  let hits = 0;
  let misses = 0;

  function registerHit() {
    hits += 1;
  }
  function registerMiss() {
    misses += 1;
  }

  function getStats() {
    return { hits, misses };
  }

  return { registerHit, registerMiss, getStats };
}
