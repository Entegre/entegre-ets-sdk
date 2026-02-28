/**
 * Telemetry modülü
 * OpenTelemetry uyumlu metrikler ve tracing
 */

/**
 * Span bilgisi
 */
export interface SpanInfo {
  /** Span ID */
  spanId: string;
  /** Trace ID */
  traceId: string;
  /** Operasyon adı */
  operationName: string;
  /** Başlangıç zamanı */
  startTime: number;
  /** Bitiş zamanı */
  endTime?: number;
  /** Süre (ms) */
  duration?: number;
  /** Durum */
  status: 'ok' | 'error';
  /** Attributes */
  attributes: Record<string, string | number | boolean>;
  /** Events */
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Metrik tipi
 */
export type MetricType = 'counter' | 'histogram' | 'gauge';

/**
 * Metrik bilgisi
 */
export interface MetricInfo {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

/**
 * Telemetry collector interface
 */
export interface TelemetryCollector {
  /** Span başlat */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): SpanInfo;
  /** Span bitir */
  endSpan(span: SpanInfo, status?: 'ok' | 'error', error?: Error): void;
  /** Counter artır */
  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
  /** Histogram kaydet */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  /** Gauge ayarla */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  /** Metrikleri al */
  getMetrics(): MetricInfo[];
  /** Span'ları al */
  getSpans(): SpanInfo[];
  /** Temizle */
  reset(): void;
}

/**
 * UUID generator
 */
function generateId(): string {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * In-memory telemetry collector
 */
export class InMemoryTelemetryCollector implements TelemetryCollector {
  private spans: SpanInfo[] = [];
  private metrics: MetricInfo[] = [];
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private maxSpans: number;
  private maxMetrics: number;

  constructor(options: { maxSpans?: number; maxMetrics?: number } = {}) {
    this.maxSpans = options.maxSpans ?? 1000;
    this.maxMetrics = options.maxMetrics ?? 10000;
  }

  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): SpanInfo {
    const span: SpanInfo = {
      spanId: generateId().slice(0, 16),
      traceId: generateId(),
      operationName: name,
      startTime: Date.now(),
      status: 'ok',
      attributes,
      events: [],
    };
    return span;
  }

  endSpan(span: SpanInfo, status: 'ok' | 'error' = 'ok', error?: Error): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (error) {
      span.attributes['error.message'] = error.message;
      span.attributes['error.type'] = error.name;
    }

    this.spans.push(span);

    // Limit spans
    if (this.spans.length > this.maxSpans) {
      this.spans = this.spans.slice(-this.maxSpans);
    }

    // Record duration histogram
    this.recordHistogram(`${span.operationName}.duration`, span.duration, {
      status: span.status,
    });
  }

  incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);

    this.addMetric({
      name,
      type: 'counter',
      value: current + value,
      labels,
      timestamp: Date.now(),
    });
  }

  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    this.addMetric({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);

    this.addMetric({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  getMetrics(): MetricInfo[] {
    return [...this.metrics];
  }

  getSpans(): SpanInfo[] {
    return [...this.spans];
  }

  reset(): void {
    this.spans = [];
    this.metrics = [];
    this.counters.clear();
    this.gauges.clear();
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private addMetric(metric: MetricInfo): void {
    this.metrics.push(metric);

    // Limit metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

/**
 * ETS-specific telemetry
 */
export class EtsTelemetry {
  private collector: TelemetryCollector;
  private serviceName: string;

  constructor(collector?: TelemetryCollector, serviceName: string = 'ets-sdk') {
    this.collector = collector ?? new InMemoryTelemetryCollector();
    this.serviceName = serviceName;
  }

  /**
   * API çağrısı izle
   */
  trackApiCall<T>(
    operation: string,
    fn: () => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const span = this.collector.startSpan(`ets.${operation}`, {
      'service.name': this.serviceName,
      ...attributes,
    });

    return fn()
      .then((result) => {
        this.collector.endSpan(span, 'ok');
        this.collector.incrementCounter('ets.requests.total', 1, {
          operation,
          status: 'success',
        });
        return result;
      })
      .catch((error) => {
        this.collector.endSpan(span, 'error', error);
        this.collector.incrementCounter('ets.requests.total', 1, {
          operation,
          status: 'error',
        });
        throw error;
      });
  }

  /**
   * Fatura gönderimi izle
   */
  trackInvoiceSend(invoiceType: string, profile: string): void {
    this.collector.incrementCounter('ets.invoices.sent', 1, {
      type: invoiceType,
      profile,
    });
  }

  /**
   * Fatura durumu izle
   */
  trackInvoiceStatus(status: string): void {
    this.collector.incrementCounter('ets.invoices.status', 1, { status });
  }

  /**
   * Webhook alımı izle
   */
  trackWebhookReceived(eventType: string): void {
    this.collector.incrementCounter('ets.webhooks.received', 1, { event: eventType });
  }

  /**
   * Aktif bağlantı sayısı
   */
  setActiveConnections(count: number): void {
    this.collector.setGauge('ets.connections.active', count);
  }

  /**
   * Metrikleri al
   */
  getMetrics(): MetricInfo[] {
    return this.collector.getMetrics();
  }

  /**
   * Span'ları al
   */
  getSpans(): SpanInfo[] {
    return this.collector.getSpans();
  }

  /**
   * Prometheus formatında export
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    const metrics = this.collector.getMetrics();

    // Group by name
    const grouped = new Map<string, MetricInfo[]>();
    for (const m of metrics) {
      const existing = grouped.get(m.name) ?? [];
      existing.push(m);
      grouped.set(m.name, existing);
    }

    for (const [name, items] of grouped) {
      const safeName = name.replace(/\./g, '_');
      const type = items[0].type;

      lines.push(`# HELP ${safeName} ETS SDK metric`);
      lines.push(`# TYPE ${safeName} ${type === 'histogram' ? 'histogram' : type}`);

      for (const item of items) {
        const labels = Object.entries(item.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${safeName}${labelStr} ${item.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Collector'ı al
   */
  getCollector(): TelemetryCollector {
    return this.collector;
  }

  /**
   * Temizle
   */
  reset(): void {
    this.collector.reset();
  }
}

/**
 * Global telemetry instance
 */
let globalTelemetry: EtsTelemetry | null = null;

/**
 * Global telemetry'yi al veya oluştur
 */
export function getGlobalTelemetry(): EtsTelemetry {
  if (!globalTelemetry) {
    globalTelemetry = new EtsTelemetry();
  }
  return globalTelemetry;
}

/**
 * Global telemetry'yi ayarla
 */
export function setGlobalTelemetry(telemetry: EtsTelemetry): void {
  globalTelemetry = telemetry;
}

/**
 * Telemetry factory
 */
export function createTelemetry(
  collector?: TelemetryCollector,
  serviceName?: string
): EtsTelemetry {
  return new EtsTelemetry(collector, serviceName);
}

/**
 * Express middleware for metrics endpoint
 */
export function createMetricsHandler(telemetry?: EtsTelemetry) {
  const t = telemetry ?? getGlobalTelemetry();

  return (req: unknown, res: { setHeader: (k: string, v: string) => void; send: (data: string) => void }) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(t.toPrometheusFormat());
  };
}
