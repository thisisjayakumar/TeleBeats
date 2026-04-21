import * as FileSystem from 'expo-file-system/legacy';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  l1MaxSize?: number;
  l2MaxSize?: number;
  defaultTtl?: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  l1MaxSize: 100,
  l2MaxSize: 500,
  defaultTtl: 5 * 60 * 1000,
};

export class TieredCache {
  private l1: Map<string, CacheEntry<unknown>>;
  private l2: Map<string, CacheEntry<unknown>>;
  private l2Dir: string;
  private config: CacheConfig;

  constructor(namespace: string, config: CacheConfig = DEFAULT_CONFIG) {
    this.l1 = new Map();
    this.l2 = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.l2Dir = '';
  }

  private getL2Dir(): string {
    if (!this.l2Dir) {
      this.l2Dir = `${FileSystem.cacheDirectory ?? ''}telebeats/cache/${this.config.l2MaxSize}/`;
    }
    return this.l2Dir;
  }

  async get<T>(key: string): Promise<T | null> {
    const l1Entry = this.l1.get(key) as CacheEntry<T> | undefined;
    if (l1Entry && !this.isExpired(l1Entry)) {
      return l1Entry.data;
    }

    const l2Entry = this.l2.get(key) as CacheEntry<T> | undefined;
    if (l2Entry && !this.isExpired(l2Entry)) {
      this.l1.set(key, l2Entry);
      return l2Entry.data;
    }

    try {
      const l3Data = await this.loadFromL3(key);
      if (l3Data && !this.isExpired(l3Data)) {
        this.l2.set(key, l3Data);
        this.l1.set(key, l3Data);
        return l3Data.data;
      }
    } catch {}

    return null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl ?? 0,
    };

    this.l1.set(key, entry as CacheEntry<unknown>);
    this.evictL1IfNeeded();

    const existingL2 = this.l2.get(key);
    this.l2.set(key, entry as CacheEntry<unknown>);
    this.evictL2IfNeeded();

    try {
      await this.saveToL3(key, entry);
    } catch {}
  }

  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    this.l2.delete(key);
    try {
      await this.deleteFromL3(key);
    } catch {}
  }

  async clear(): Promise<void> {
    this.l1.clear();
    this.l2.clear();
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.ttl <= 0) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictL1IfNeeded(): void {
    if (this.config.l1MaxSize && this.l1.size > this.config.l1MaxSize) {
      const firstKey = this.l1.keys().next().value;
      if (firstKey) this.l1.delete(firstKey);
    }
  }

  private evictL2IfNeeded(): void {
    if (this.config.l2MaxSize && this.l2.size > this.config.l2MaxSize) {
      const firstKey = this.l2.keys().next().value;
      if (firstKey) this.l2.delete(firstKey);
    }
  }

  private l3Key(key: string): string {
    return `${this.getL2Dir()}${key}.json`;
  }

  private async loadFromL3<T>(key: string): Promise<CacheEntry<T> | null {
    const path = this.l3Key(key);
    try {
      const exists = await FileSystem.getInfoAsync(path);
      if (!exists.exists) return null;
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async saveToL3<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const path = this.l3Key(key);
    const dir = this.getL2Dir();
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(path, JSON.stringify(entry));
  }

  private async deleteFromL3(key: string): Promise<void> {
    const path = this.l3Key(key);
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

const caches = new Map<string, TieredCache>();

export function getCache(namespace: string, config?: CacheConfig): TieredCache {
  if (!caches.has(namespace)) {
    caches.set(namespace, new TieredCache(namespace, config));
  }
  return caches.get(namespace)!;
}