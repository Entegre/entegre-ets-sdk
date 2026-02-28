import type { InvoiceRequest, InvoiceResult, DispatchRequest, DispatchResult } from '../types';

/**
 * Batch işlem sonucu
 */
export interface BatchResult<T> {
  /** Toplam işlem sayısı */
  total: number;
  /** Başarılı işlem sayısı */
  successful: number;
  /** Başarısız işlem sayısı */
  failed: number;
  /** Sonuçlar */
  results: BatchItemResult<T>[];
  /** Toplam süre (ms) */
  duration: number;
}

/**
 * Tek bir batch öğesinin sonucu
 */
export interface BatchItemResult<T> {
  /** Index */
  index: number;
  /** Başarılı mı? */
  success: boolean;
  /** Sonuç verisi */
  data?: T;
  /** Hata */
  error?: Error;
  /** İşlem süresi (ms) */
  duration: number;
}

/**
 * Batch konfigürasyonu
 */
export interface BatchConfig {
  /** Paralel işlem sayısı (varsayılan: 5) */
  concurrency?: number;
  /** Hata durumunda devam et (varsayılan: true) */
  continueOnError?: boolean;
  /** İşlemler arası bekleme (ms) */
  delayBetween?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number, result: BatchItemResult<unknown>) => void;
  /** Retry sayısı (varsayılan: 0) */
  retries?: number;
  /** Retry bekleme süresi (ms) */
  retryDelay?: number;
}

const DEFAULT_CONCURRENCY = 5;

/**
 * Batch işlem executor
 */
export class BatchExecutor<TInput, TOutput> {
  private config: Required<BatchConfig>;

  constructor(
    private executor: (input: TInput, index: number) => Promise<TOutput>,
    config: BatchConfig = {}
  ) {
    this.config = {
      concurrency: config.concurrency || DEFAULT_CONCURRENCY,
      continueOnError: config.continueOnError ?? true,
      delayBetween: config.delayBetween || 0,
      onProgress: config.onProgress || (() => {}),
      retries: config.retries || 0,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Batch işlemi çalıştırır
   */
  async execute(items: TInput[]): Promise<BatchResult<TOutput>> {
    const startTime = Date.now();
    const results: BatchItemResult<TOutput>[] = [];
    let successful = 0;
    let failed = 0;

    // Chunk'lara böl
    const chunks = this.chunkArray(items, this.config.concurrency);
    let globalIndex = 0;

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, localIndex) => {
        const index = globalIndex + localIndex;
        const itemResult = await this.executeItem(item, index);

        if (itemResult.success) {
          successful++;
        } else {
          failed++;
        }

        results[index] = itemResult;
        this.config.onProgress(results.filter(Boolean).length, items.length, itemResult);

        return itemResult;
      });

      await Promise.all(chunkPromises);
      globalIndex += chunk.length;

      // Chunk arası bekleme
      if (this.config.delayBetween > 0 && globalIndex < items.length) {
        await this.sleep(this.config.delayBetween);
      }

      // Hata durumunda dur
      if (!this.config.continueOnError && failed > 0) {
        break;
      }
    }

    return {
      total: items.length,
      successful,
      failed,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Tek bir öğeyi işler
   */
  private async executeItem(item: TInput, index: number): Promise<BatchItemResult<TOutput>> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const data = await this.executor(item, index);
        return {
          index,
          success: true,
          data,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    return {
      index,
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Array'i chunk'lara böler
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Batch invoice sender
 */
export class BatchInvoiceSender {
  constructor(
    private sendFn: (request: InvoiceRequest) => Promise<InvoiceResult>,
    private config: BatchConfig = {}
  ) {}

  /**
   * Faturaları toplu gönderir
   */
  async send(invoices: InvoiceRequest[]): Promise<BatchResult<InvoiceResult>> {
    const executor = new BatchExecutor<InvoiceRequest, InvoiceResult>(
      (invoice) => this.sendFn(invoice),
      this.config
    );
    return executor.execute(invoices);
  }

  /**
   * Progress ile gönderir
   */
  async sendWithProgress(
    invoices: InvoiceRequest[],
    onProgress: (completed: number, total: number, result: BatchItemResult<InvoiceResult>) => void
  ): Promise<BatchResult<InvoiceResult>> {
    const executor = new BatchExecutor<InvoiceRequest, InvoiceResult>(
      (invoice) => this.sendFn(invoice),
      { ...this.config, onProgress: onProgress as BatchConfig['onProgress'] }
    );
    return executor.execute(invoices);
  }
}

/**
 * Batch dispatch sender
 */
export class BatchDispatchSender {
  constructor(
    private sendFn: (request: DispatchRequest) => Promise<DispatchResult>,
    private config: BatchConfig = {}
  ) {}

  /**
   * İrsaliyeleri toplu gönderir
   */
  async send(dispatches: DispatchRequest[]): Promise<BatchResult<DispatchResult>> {
    const executor = new BatchExecutor<DispatchRequest, DispatchResult>(
      (dispatch) => this.sendFn(dispatch),
      this.config
    );
    return executor.execute(dispatches);
  }
}

/**
 * Generic batch processor
 */
export async function processBatch<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput, index: number) => Promise<TOutput>,
  config?: BatchConfig
): Promise<BatchResult<TOutput>> {
  const executor = new BatchExecutor(processor, config);
  return executor.execute(items);
}

/**
 * Paralel işlem limiter
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i], i).then((result) => {
      results[i] = result;
    });

    executing.push(promise as unknown as Promise<void>);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Batch factory
 */
export function createBatchSender<T, R>(
  sendFn: (item: T) => Promise<R>,
  config?: BatchConfig
): {
  send: (items: T[]) => Promise<BatchResult<R>>;
  sendWithProgress: (items: T[], onProgress: BatchConfig['onProgress']) => Promise<BatchResult<R>>;
} {
  return {
    send: async (items: T[]) => {
      const executor = new BatchExecutor<T, R>((item) => sendFn(item), config);
      return executor.execute(items);
    },
    sendWithProgress: async (items: T[], onProgress: BatchConfig['onProgress']) => {
      const executor = new BatchExecutor<T, R>((item) => sendFn(item), { ...config, onProgress });
      return executor.execute(items);
    },
  };
}
