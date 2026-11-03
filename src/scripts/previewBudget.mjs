// Background media share one budget; high-resolution video requires user interest.
export function choosePreviewMotion(candidates, {limit = 2, reduced = false, saveData = false} = {}) {
 if (reduced || saveData) return new Set();
 const eligible = candidates.filter(item => item.visible >= 0.35 &&
  (item.kind !== 'video' || item.engaged || item.pixels <= 1920 * 1080));
 eligible.sort((a,b) => Number(b.engaged)-Number(a.engaged) || b.priority-a.priority);
 if (eligible[0]?.kind === 'video' && eligible[0].pixels > 1920 * 1080) limit = 1;
 return new Set(eligible.slice(0,limit).map(item=>item.id));
}
