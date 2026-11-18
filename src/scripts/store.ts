// Small localStorage-backed stores. Storage can be unavailable (private mode,
// blocked site data) or hold values written by an older build or another tab,
// so every access is guarded, every read is shape-checked, and an in-memory map
// keeps the current page working when storage throws.

import type { SearchDoc } from '../pages/search-index.json';

const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return raw;
  } catch {
    /* storage unavailable: fall through to memory */
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, raw: string) {
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* storage unavailable: memory keeps this page consistent */
  }
}

/** Reads a JSON list of ids, dropping anything that is not a non-empty string. */
function readIds(key: string): string[] {
  const raw = readRaw(key);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))];
  } catch {
    return [];
  }
}

const FAVS = 'dnd-ref:favourites';
const RECENT = 'dnd-ref:recent';
const THEME = 'dnd-ref:theme';

export const getFavourites = () => readIds(FAVS);

export function toggleFavourite(id: string) {
  const favs = getFavourites();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [id, ...favs];
  writeRaw(FAVS, JSON.stringify(next));
  document.dispatchEvent(new CustomEvent('favourites-change', { detail: next }));
  return next.includes(id);
}

export const getRecent = () => readIds(RECENT);

export function pushRecent(id: string) {
  writeRaw(RECENT, JSON.stringify([id, ...getRecent().filter((r) => r !== id)].slice(0, 8)));
}

export function getTheme(): 'light' | 'dark' | null {
  const t = readRaw(THEME);
  return t === 'light' || t === 'dark' ? t : null;
}

export function setTheme(theme: 'light' | 'dark') {
  writeRaw(THEME, theme);
}

export function setSidebar(state: 'collapsed' | 'expanded') {
  writeRaw('dnd-ref:sidebar', state);
}

let indexPromise: Promise<SearchDoc[]> | undefined;

export function loadIndex(): Promise<SearchDoc[]> {
  indexPromise ??= fetch(`${document.body.dataset.base}search-index.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Search index ${r.status}`))))
    .then((data: unknown) => (Array.isArray(data) ? (data as SearchDoc[]) : Promise.reject(new Error('Search index malformed'))))
    .catch((err) => {
      indexPromise = undefined;
      throw err;
    });
  return indexPromise;
}
