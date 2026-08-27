// Lightweight client for Google's free, keyless "translate_a/single" endpoint
// — the same one many no-API-key translate widgets/libraries use. It isn't
// an officially documented/supported API (no SLA, can rate-limit under
// heavy load), which is the trade-off for not requiring a paid Cloud
// Translation API key or a backend proxy. If this app ever needs guaranteed
// uptime for translation, swap `translateBatch` below for a call to Google
// Cloud Translation / DeepL / Azure Translator instead — everything else
// (caching, DOM walking, the language picker) stays the same.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const CACHE_KEY = 'malvinai_translate_cache_v1';
// Keep the on-disk cache from growing without bound over a long session.
const MAX_CACHE_ENTRIES = 5000;

type Cache = Record<string, string>; // `${lang}\u0001${original}` -> translated

let memoryCache: Cache | null = null;

function loadCache(): Cache {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    memoryCache = raw ? JSON.parse(raw) : {};
  } catch {
    memoryCache = {};
  }
  return memoryCache!;
}

function persistCache() {
  if (!memoryCache) return;
  try {
    const keys = Object.keys(memoryCache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      // Cheapest eviction that doesn't need a real LRU: drop the oldest
      // (earliest-inserted, since object key order is insertion order)
      // quarter of entries once we're over budget.
      const toDrop = keys.slice(0, Math.floor(keys.length / 4));
      for (const k of toDrop) delete memoryCache![k];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // Storage full/unavailable — translations still work, just re-fetched
    // more often. Not worth surfacing to the user.
  }
}

function cacheKey(lang: string, text: string): string {
  return `${lang}\u0001${text}`;
}

async function translateOne(text: string, targetLang: string): Promise<string> {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translate request failed: ${res.status}`);
  const data = await res.json();
  // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
  // Long strings come back split into sentence chunks that need rejoining.
  const chunks = data?.[0];
  if (!Array.isArray(chunks)) return text;
  return chunks.map((c: any) => c?.[0] ?? '').join('');
}

/**
 * Translates a batch of unique strings to `targetLang`, using the on-disk
 * cache wherever possible so re-visiting a language (or a page you've
 * already seen in that language) costs nothing. Requests run with a small
 * concurrency cap rather than all at once, since the endpoint is a public,
 * unauthenticated one and hammering it with hundreds of parallel requests
 * is both rude and likely to get this app rate-limited.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
  concurrency = 5
): Promise<Map<string, string>> {
  const cache = loadCache();
  const result = new Map<string, string>();
  const pending: string[] = [];

  for (const text of texts) {
    const key = cacheKey(targetLang, text);
    if (cache[key]) {
      result.set(text, cache[key]);
    } else {
      pending.push(text);
    }
  }

  let cursor = 0;
  let dirty = false;
  async function worker() {
    while (cursor < pending.length) {
      const text = pending[cursor++];
      try {
        const translated = await translateOne(text, targetLang);
        result.set(text, translated);
        cache[cacheKey(targetLang, text)] = translated;
        dirty = true;
      } catch {
        // Leave this one untranslated rather than failing the whole batch —
        // a mixed-language page beats a broken one.
        result.set(text, text);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
  if (dirty) persistCache();
  return result;
}
