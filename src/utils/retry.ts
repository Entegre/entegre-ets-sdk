/**
 * Retry konfigürasyonu
 */
export interface RetryConfig {
  /** Maksimum deneme sayısı (varsayılan: 3) */
  maxRetries?: number;
  /** Başlangıç bekleme süresi ms (varsayılan: 1000) */
  initialDelay?: number;
  /** Maksimum bekleme süresi ms (varsayılan: 30000) */
  maxDelay?: number;
  /** Backoff çarpanı (varsayılan: 2) */
  backoffMultiplier?: number;
  /** Retry yapılacak HTTP status kodları (varsayılan: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Retry öncesi callback */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Retry yapılabilir hata mı kontrol eder
 */
export function isRetryableError(error: unknown, config: RetryConfig = {}): boolean {
  const statuses = config.retryableStatuses || DEFAULT_RETRY_CONFIG.retryableStatuses;

  // Axios error check
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number }; code?: string };

    // Status code check
    if (axiosError.response?.status && statuses.includes(axiosError.response.status)) {
      return true;
    }

    // Network errors
    if (axiosError.code === 'ECONNRESET' || axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ENOTFOUND') {
      return true;
    }
  }

  // Network error without response
  if (error && typeof error === 'object' && 'code' in error) {
    const networkError = error as { code?: string };
    if (networkError.code === 'ECONNRESET' || networkError.code === 'ETIMEDOUT' || networkError.code === 'ENOTFOUND') {
      return true;
    }
  }

  return false;
}

/**
 * Exponential backoff ile delay hesaplar
 */
export function calculateDelay(attempt: number, config: RetryConfig = {}): number {
  const initialDelay = config.initialDelay || DEFAULT_RETRY_CONFIG.initialDelay;
  const maxDelay = config.maxDelay || DEFAULT_RETRY_CONFIG.maxDelay;
  const multiplier = config.backoffMultiplier || DEFAULT_RETRY_CONFIG.backoffMultiplier;

  // Exponential backoff with jitter
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // %10 jitter

  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Async fonksiyonu retry ile çalıştırır
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Son deneme veya retry yapılamaz hata
      if (attempt > maxRetries || !isRetryableError(error, config)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);

      // Retry callback
      if (config.onRetry) {
        config.onRetry(lastError, attempt, delay);
      }

      // Bekle
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorator factory
 */
export function retryable(config: RetryConfig = {}) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), config);
    } as T;

    return descriptor;
  };
}
