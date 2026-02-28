/**
 * Health Check modülü
 * API bağlantı durumunu kontrol eder
 */

export interface HealthCheckResult {
  /** Genel durum */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Kontrol zamanı */
  timestamp: string;
  /** Toplam süre (ms) */
  totalDuration: number;
  /** Detaylı kontroller */
  checks: HealthCheckEntry[];
}

export interface HealthCheckEntry {
  /** Kontrol adı */
  name: string;
  /** Durum */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Süre (ms) */
  duration: number;
  /** Açıklama */
  description?: string;
  /** Hata mesajı */
  error?: string;
  /** Ek veri */
  data?: Record<string, unknown>;
}

export interface HealthCheckOptions {
  /** Timeout (ms) */
  timeout?: number;
  /** Degraded threshold (ms) */
  degradedThreshold?: number;
  /** Detaylı kontrol */
  detailed?: boolean;
}

/**
 * ETS API Health Check
 */
export class EtsHealthCheck {
  private baseUrl: string;
  private timeout: number;
  private degradedThreshold: number;

  constructor(baseUrl: string, options: HealthCheckOptions = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout ?? 5000;
    this.degradedThreshold = options.degradedThreshold ?? 2000;
  }

  /**
   * Tüm sağlık kontrollerini çalıştırır
   */
  async check(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckEntry[] = [];

    // API Connectivity Check
    checks.push(await this.checkApiConnectivity());

    // Auth Endpoint Check
    if (options.detailed) {
      checks.push(await this.checkAuthEndpoint());
    }

    const totalDuration = Date.now() - startTime;
    const overallStatus = this.calculateOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalDuration,
      checks,
    };
  }

  /**
   * API bağlantısını kontrol eder
   */
  private async checkApiConnectivity(): Promise<HealthCheckEntry> {
    const startTime = Date.now();
    const name = 'api_connectivity';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          name,
          status: duration > this.degradedThreshold ? 'degraded' : 'healthy',
          duration,
          description: 'API is reachable',
          data: { statusCode: response.status },
        };
      } else {
        return {
          name,
          status: 'unhealthy',
          duration,
          description: 'API returned error',
          error: `HTTP ${response.status}`,
          data: { statusCode: response.status },
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name,
        status: 'unhealthy',
        duration,
        description: 'Failed to connect to API',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Auth endpoint'ini kontrol eder
   */
  private async checkAuthEndpoint(): Promise<HealthCheckEntry> {
    const startTime = Date.now();
    const name = 'auth_endpoint';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/auth/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      return {
        name,
        status: response.ok ? 'healthy' : 'degraded',
        duration,
        description: response.ok ? 'Auth service is available' : 'Auth service may have issues',
        data: { statusCode: response.status },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name,
        status: 'degraded',
        duration,
        description: 'Could not verify auth endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Genel durumu hesaplar
   */
  private calculateOverallStatus(checks: HealthCheckEntry[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

/**
 * Health check factory
 */
export function createHealthCheck(baseUrl: string, options?: HealthCheckOptions): EtsHealthCheck {
  return new EtsHealthCheck(baseUrl, options);
}

/**
 * Express/Koa middleware için health check handler
 */
export function createHealthCheckHandler(baseUrl: string, options?: HealthCheckOptions) {
  const healthCheck = new EtsHealthCheck(baseUrl, options);

  return async (req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => {
    const result = await healthCheck.check({ detailed: true });
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(result);
  };
}
