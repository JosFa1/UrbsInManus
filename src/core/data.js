const _cache = new Map();

function normalizePath(path) {
  // Allow callers to pass "data/foo.json" or "./data/foo.json"
  if (path.startsWith('./')) return path.slice(2);
  if (path.startsWith('/')) return path.slice(1);
  return path;
}

/**
 * @param {string} path
 */
export async function loadJson(path) {
  const normalized = normalizePath(path);
  if (_cache.has(normalized)) return _cache.get(normalized);

  const promise = (async () => {
    const res = await fetch(`./${normalized}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load ${normalized}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  })();

  _cache.set(normalized, promise);
  return promise;
}
