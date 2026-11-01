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
    try {
      let url = new URL(value, 'https://portfolio.invalid' + base);
      // Astro development images wrap the original /@fs/ URL in ?href=.
      if (url.pathname.replace(/\/$/, '') === base + '_image' && url.searchParams.has('href')) {
        url = new URL(url.searchParams.get('href'), url);
      }
      path = decodeURIComponent(url.pathname);
      if (path.includes('/@fs/')) {
        const publicIndex = path.lastIndexOf('/public/');
        if (publicIndex >= 0) path = base + path.slice(publicIndex + '/public/'.length);
      }
    }
    catch { return value; }
    let pair = direct.get(path);
    if (!pair && path.startsWith(base + '_astro/')) {
      const name = path.split('/').pop();
      pair = [...optimized].find(([stem, candidate]) => candidate && name.startsWith(stem + '.'))?.[1];
    }
    return pair ? base + pair[language === 'ru' ? 'ru' : 'en'] : value;
  };
}
