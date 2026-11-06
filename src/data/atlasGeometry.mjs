export function unitySpritesToTopLeft(sprites, width, height) {
  return sprites.map(sprite => {
    const { x, y, width: w, height: h } = sprite;
    if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > width || y + h > height || typeof sprite.name !== 'string') {
      throw new Error(`Sprite outside atlas: ${sprite.name}`);
    }
    return { name: sprite.name, x, y: height - y - h, width: w, height: h };
  });
}

export function spriteAt(sprites, x, y) {
  // Small regions win when an atlas also contains larger composite sprites.
  return sprites.reduce((best, s, index) => x >= s.x && y >= s.y && x < s.x + s.width && y < s.y + s.height &&
    (best < 0 || s.width * s.height < sprites[best].width * sprites[best].height) ? index : best, -1);
}

// Compact coordinates only: the browser shares one atlas image between cells.
export function atlasPreviewCells(sprites) {
  const unique = new Map();
  for (const s of sprites) {
    if (s.empty) continue;
    const cell = [s.x, s.y, s.width, s.height];
    unique.set(cell.join(','), cell);
  }
  return [...unique.values()];
}
