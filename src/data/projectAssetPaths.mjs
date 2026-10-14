/** One local path format for every project asset; external media must use HTTPS. */
export function isProjectAssetPath(value) {
  if (typeof value !== 'string' || /[\\:%?#\x00-\x1f\x7f]/.test(value)) return false;
  const parts = value.split('/');
  return parts.length >= 3 && parts[0] === 'projects' &&
    parts.every(part => part.length > 0 && part !== '.' && part !== '..' && part === part.trim());
}

export function isHttpsMediaUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false;
  try { const url = new URL(value); return !url.username && !url.password; }
  catch { return false; }
}

export function projectAssetUrl(value, base) {
  if (isHttpsMediaUrl(value)) return value;
  if (!isProjectAssetPath(value)) throw new Error(`Invalid project asset path: ${value}`);
  return `${base}${value.split('/').map(encodeURIComponent).join('/')}`;
}
