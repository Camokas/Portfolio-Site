// Fit the projected bounds, including depth; independent of model units.
export function previewDistance(size, aspect, fov = 42, orbit = false, direction = [3.6, 2.5, 4.6]) {
  const length = Math.hypot(...direction);
  const forward = direction.map(n => n / length);
  const horizontal = Math.hypot(forward[0], forward[2]);
  const right = [forward[2] / horizontal, 0, -forward[0] / horizontal];
  const up = [-forward[1] * forward[0] / horizontal, horizontal, -forward[1] * forward[2] / horizontal];
  const tangent = Math.tan(fov * Math.PI / 360) * 0.84;
  let distance = 0;
  for (let pose = 0; pose < (orbit ? 32 : 1); pose++) {
    const angle = pose * Math.PI / 16, c = Math.cos(angle), s = Math.sin(angle);
    for (const x of [-size.x / 2, size.x / 2]) for (const y of [-size.y / 2, size.y / 2]) for (const z of [-size.z / 2, size.z / 2]) {
      const point = [x * c + z * s, y, z * c - x * s];
      const dot = axis => point.reduce((sum, n, i) => sum + n * axis[i], 0);
      distance = Math.max(distance, dot(forward) + Math.abs(dot(right)) / (tangent * aspect), dot(forward) + Math.abs(dot(up)) / tangent);
    }
  }
  return Math.max(distance, 0.1);
}
