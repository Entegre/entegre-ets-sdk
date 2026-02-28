/**
 * Rate limiter konfigürasyonu
 */
export interface RateLimiterConfig {
  /** Maksimum istek sayısı */
  maxRequests: number;
  /** Zaman penceresi (ms) */
  windowMs: number;
  /** Limit aşıldığında bekleme stratejisi */
  strategy?: 'throw' | 'wait';
}

/**
 * Rate limit hatası
 */
export class RateLimitError extends Error {
  /** Yeniden deneme için bekleme süresi (ms) */
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private readonly strategy: 'throw' | 'wait';
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private processing = false;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxRequests;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = config.maxRequests / config.windowMs;
    this.strategy = config.strategy || 'wait';
  }

  /**
   * Token'ları yeniler
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Bir token tüketmeyi dener
   */
  private tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Token bekler (bekleme stratejisi için)
   */
  private getWaitTime(): number {
    this.refill();
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Kuyruğu işler
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (this.tryConsume()) {
        const item = this.queue.shift();
        item?.resolve();
      } else {
        const waitTime = this.getWaitTime();
        await this.sleep(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * İstek yapmadan önce rate limit kontrolü
   */
  async acquire(): Promise<void> {
    if (this.tryConsume()) {
      return;
    }

    if (this.strategy === 'throw') {
      throw new RateLimitError(this.getWaitTime());
    }

    // Wait stratejisi - kuyruğa ekle
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Fonksiyonu rate limit ile çalıştırır
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Mevcut token sayısını döner
   */
  availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Rate limiter'ı resetler
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
  }

  /**
   * İstatistikleri döner
   */
  stats(): { availableTokens: number; maxTokens: number; queueLength: number } {
    return {
      availableTokens: this.availableTokens(),
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
    };
  }
}

/**
 * Sliding window rate limiter (daha hassas)
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly strategy: 'throw' | 'wait';

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.strategy = config.strategy || 'wait';
  }

  /**
   * Eski timestamp'leri temizler
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > cutoff);
  }

  /**
   * Rate limit kontrolü
   */
  async acquire(): Promise<void> {
    this.cleanup();

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return;
    }

    if (this.strategy === 'throw') {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = oldestTimestamp + this.windowMs - Date.now();
      throw new RateLimitError(Math.max(0, waitTime));
    }

    // Wait stratejisi
    const oldestTimestamp = this.timestamps[0];
    const waitTime = oldestTimestamp + this.windowMs - Date.now();

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.cleanup();
    this.timestamps.push(Date.now());
  }

  /**
   * Fonksiyonu rate limit ile çalıştırır
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Kalan istek sayısını döner
   */
  remaining(): number {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /**
   * Reset zamanını döner (ms)
   */
  resetIn(): number {
    if (this.timestamps.length === 0) return 0;
    const oldestTimestamp = this.timestamps[0];
    return Math.max(0, oldestTimestamp + this.windowMs - Date.now());
  }

  /**
   * Rate limiter'ı resetler
   */
  reset(): void {
    this.timestamps = [];
  }

  /**
   * İstatistikleri döner
   */
  stats(): { remaining: number; total: number; resetIn: number } {
    return {
      remaining: this.remaining(),
      total: this.maxRequests,
      resetIn: this.resetIn(),
    };
  }
}

/**
 * Varsayılan rate limiter presets
 */
export const RATE_LIMIT_PRESETS = {
  /** Dakikada 60 istek (1/saniye) */
  STANDARD: { maxRequests: 60, windowMs: 60 * 1000 },
  /** Dakikada 30 istek */
  CONSERVATIVE: { maxRequests: 30, windowMs: 60 * 1000 },
  /** Dakikada 120 istek (2/saniye) */
  AGGRESSIVE: { maxRequests: 120, windowMs: 60 * 1000 },
  /** Saatte 1000 istek */
  HOURLY: { maxRequests: 1000, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * Rate limiter factory
 */
export function createRateLimiter(
  preset: keyof typeof RATE_LIMIT_PRESETS | RateLimiterConfig,
  strategy: 'throw' | 'wait' = 'wait'
): RateLimiter {
  const config = typeof preset === 'string' ? RATE_LIMIT_PRESETS[preset] : preset;
  return new RateLimiter({ ...config, strategy });
}
