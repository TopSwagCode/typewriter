// Score popup system: lightweight floating +1 animation.
// Usage: createScorePopup(scene, x, y, value = 1)

export function createScorePopup(scene, x, y, value = 1) {
  const txt = scene.add.text(x, y, `+${value}`, {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: '#6ee7b7',
    stroke: '#0f172a',
    strokeThickness: 2,
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: txt,
    y: y - 40,
    alpha: 0,
    scale: 1.2,
    duration: 520,
    ease: 'Quadratic.Out',
    onComplete: () => txt.destroy(),
  });
}
