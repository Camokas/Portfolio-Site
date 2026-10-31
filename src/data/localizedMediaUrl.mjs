export function createMediaResolver(pairs, baseUrl) {
  const base = baseUrl.replace(/\/?$/, '/');
  const direct = new Map(), optimized = new Map();
  for (const pair of pairs) for (const path of [pair.en, pair.ru]) {
    direct.set(base + path, pair);
    const stem = path.split('/').pop().replace(/\.[^.]+$/, '');
    // An optimized basename is only safe if it identifies one original pair.
    if (!optimized.has(stem)) optimized.set(stem, pair);
    else if (optimized.get(stem) !== pair) optimized.set(stem, null);
  }
  return (value, language) => {
    if (!value || /^(data:|blob:)/.test(value)) return value;
    let path;
    try { path = decodeURIComponent(new URL(value, 'https://portfolio.invalid' + base).pathname); }
    catch { return value; }
    let pair = direct.get(path);
    if (!pair && path.startsWith(base + '_astro/')) {
      const name = path.split('/').pop();
      pair = [...optimized].find(([stem, candidate]) => candidate && name.startsWith(stem + '.'))?.[1];
    }
    return pair ? base + pair[language === 'ru' ? 'ru' : 'en'] : value;
  };
}
