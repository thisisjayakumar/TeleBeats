import * as SecureStore from 'expo-secure-store';

const RECENTLY_PLAYED_KEY = 'telebeats_recently_played_v1';
const MAX_ITEMS = 20;

type Listener = (ids: string[]) => void;
const listeners = new Set<Listener>();
let inMemoryCache: string[] | null = null;
let loadingPromise: Promise<string[]> | null = null;

export async function getRecentlyPlayedIds(): Promise<string[]> {
  if (inMemoryCache) return inMemoryCache;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      try {
        const stored = await SecureStore.getItemAsync(RECENTLY_PLAYED_KEY);
        const parsed = stored ? (JSON.parse(stored) as string[]) : [];
        inMemoryCache = Array.isArray(parsed) ? parsed : [];
      } catch {
        inMemoryCache = [];
      }
      return inMemoryCache!;
    })();
  }
  return loadingPromise;
}

export async function addRecentlyPlayedId(songId: string): Promise<void> {
  const list = [...(await getRecentlyPlayedIds())];
  const existingIndex = list.indexOf(songId);
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
  }
  list.unshift(songId);
  if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;
  inMemoryCache = list;
  try {
    await SecureStore.setItemAsync(RECENTLY_PLAYED_KEY, JSON.stringify(list));
  } catch {
    // ignore persistence errors
  }
  emit(list);
}

export async function clearRecentlyPlayed(): Promise<void> {
  inMemoryCache = [];
  try {
    await SecureStore.deleteItemAsync(RECENTLY_PLAYED_KEY);
  } catch {
    // ignore
  }
  emit([]);
}

export function subscribeRecentlyPlayed(listener: Listener): () => void {
  listeners.add(listener);
  if (inMemoryCache) {
    // notify immediately with current cache
    listener(inMemoryCache);
  } else {
      // fire and forget load
      void getRecentlyPlayedIds().then((ids) => listener(ids));
  }
  return () => listeners.delete(listener);
}

function emit(ids: string[]) {
  for (const l of Array.from(listeners)) {
    try {
      l(ids);
    } catch {
      // ignore bad listeners
    }
  }
}

