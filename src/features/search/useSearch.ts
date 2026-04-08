import { useEffect, useMemo, useState } from 'react';
import { getSongRepository } from '../../db';
import type { SongRow } from '../../db/schema';

function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delayMs);
  };
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [allSongs, setAllSongs] = useState<SongRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    void getSongRepository()
      .getAllSongs()
      .then((rows) => {
        if (mounted) setAllSongs(rows);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [internalQuery, setInternalQuery] = useState('');
  useEffect(() => {
    const apply = debounce((q: string) => setInternalQuery(q.trim()), 150);
    apply(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const results = useMemo(() => {
    if (!allSongs) return [];
    const q = internalQuery.toLowerCase();
    if (!q) return [];
    return allSongs.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album ?? '').toLowerCase().includes(q) ||
        s.channelTitle.toLowerCase().includes(q)
      );
    });
  }, [allSongs, internalQuery]);

  return { query, setQuery, isLoading, results };
}

