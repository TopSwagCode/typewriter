// Simple shatter effect: spawn small rectangular shards that fly outward and fade.
// Lightweight implementation using Phaser.GameObjects.Rectangle.
// Tuning parameters at top for easy adjustment.

const SHARD_CONFIG = {
  minShards: 5,
  maxShards: 9,
  minSize: 4,
  maxSize: 10,
  lifeMs: 450,
  expandFactor: 1.15, // initial scale bump
  velocityBase: 90, // base speed for shards
};

export function createShatter(scene, source) {
  const { x, y } = source;
  const color = source.style?.color || '#ffffff';
  const shardCount = Math.floor(
    SHARD_CONFIG.minShards + Math.random() * (SHARD_CONFIG.maxShards - SHARD_CONFIG.minShards)
  );

  for (let i = 0; i < shardCount; i += 1) {
    const w = SHARD_CONFIG.minSize + Math.random() * (SHARD_CONFIG.maxSize - SHARD_CONFIG.minSize);
    const h = SHARD_CONFIG.minSize + Math.random() * (SHARD_CONFIG.maxSize - SHARD_CONFIG.minSize);
    const rect = scene.add.rectangle(x, y, w, h, 0xffffff).setOrigin(0.5);
    rect.setFillStyle(Phaser.Display.Color.HexStringToColor(color).color);

    // Random outward direction
    const angle = Math.random() * Math.PI * 2;
    const speed = SHARD_CONFIG.velocityBase + Math.random() * 80;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Tween for movement & fade
    scene.tweens.add({
      targets: rect,
      x: x + vx * (SHARD_CONFIG.lifeMs / 1000),
      y: y + vy * (SHARD_CONFIG.lifeMs / 1000),
      alpha: 0,
      scale: SHARD_CONFIG.expandFactor,
      ease: 'Quadratic.Out',
      duration: SHARD_CONFIG.lifeMs,
      onComplete: () => rect.destroy(),
    });
  }
}
