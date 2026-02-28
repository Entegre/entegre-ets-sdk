/**
 * Cache entry
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache konfigürasyonu
 */
export interface CacheConfig {
  /** Varsayılan TTL (ms) - varsayılan: 5 dakika */
  defaultTtl?: number;
  /** Maksimum entry sayısı - varsayılan: 1000 */
  maxSize?: number;
  /** Cache namespace */
  namespace?: string;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 dakika
const DEFAULT_MAX_SIZE = 1000;

/**
 * In-memory cache implementation
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private readonly namespace: string;

  constructor(config: CacheConfig = {}) {
    this.defaultTtl = config.defaultTtl || DEFAULT_TTL;
    this.maxSize = config.maxSize || DEFAULT_MAX_SIZE;
    this.namespace = config.namespace || '';
  }

  /**
   * Cache key oluşturur
   */
  private getKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /**
   * Değer alır
   */
  get(key: string): T | undefined {
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return undefined;
    }

    // Expire kontrolü
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Değer kaydeder
   */
  set(key: string, value: T, ttl?: number): void {
    const fullKey = this.getKey(key);

    // Max size kontrolü
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(fullKey, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTtl),
    });
  }

  /**
   * Değer varsa döner, yoksa factory fonksiyonunu çalıştırıp kaydeder
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Değer siler
   */
  delete(key: string): boolean {
    return this.cache.delete(this.getKey(key));
  }

  /**
   * Tüm cache'i temizler
   */
  clear(): void {
    if (this.namespace) {
      // Sadece namespace'e ait olanları sil
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${this.namespace}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Cache boyutunu döner
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Key'in cache'de olup olmadığını kontrol eder
   */
  has(key: string): boolean {
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  /**
   * Expire olan entry'leri temizler
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * En eski entry'yi siler (LRU benzeri)
   */
  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Cache istatistiklerini döner
   */
  stats(): { size: number; namespace: string; defaultTtl: number; maxSize: number } {
    return {
      size: this.cache.size,
      namespace: this.namespace,
      defaultTtl: this.defaultTtl,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Mükellef bilgileri için özel cache
 */
export class UserCache extends MemoryCache<{ isActive: boolean; aliases?: string[] }> {
  constructor(ttl: number = 30 * 60 * 1000) { // 30 dakika varsayılan
    super({
      namespace: 'user',
      defaultTtl: ttl,
      maxSize: 10000,
    });
  }

  /**
   * Mükellef bilgisini cache'ler
   */
  cacheUser(partyId: string, isActive: boolean, aliases?: string[]): void {
    this.set(partyId, { isActive, aliases });
  }

  /**
   * Mükellef durumunu döner
   */
  getUser(partyId: string): { isActive: boolean; aliases?: string[] } | undefined {
    return this.get(partyId);
  }

  /**
   * Alias'ları günceller
   */
  updateAliases(partyId: string, aliases: string[]): void {
    const existing = this.get(partyId);
    if (existing) {
      this.set(partyId, { ...existing, aliases });
    }
  }
}

/**
 * Döviz kuru cache'i
 */
export class ExchangeRateCache extends MemoryCache<number> {
  constructor(ttl: number = 60 * 60 * 1000) { // 1 saat varsayılan
    super({
      namespace: 'exchange',
      defaultTtl: ttl,
      maxSize: 500,
    });
  }

  /**
   * Kur bilgisini cache'ler
   */
  cacheRate(currency: string, date: string, rate: number): void {
    this.set(`${currency}:${date}`, rate);
  }

  /**
   * Kur bilgisini döner
   */
  getRate(currency: string, date: string): number | undefined {
    return this.get(`${currency}:${date}`);
  }
}

/**
 * Global cache instance'ları
 */
export const userCache = new UserCache();
export const exchangeRateCache = new ExchangeRateCache();

/**
 * Tüm cache'leri temizler
 */
export function clearAllCaches(): void {
  userCache.clear();
  exchangeRateCache.clear();
}
