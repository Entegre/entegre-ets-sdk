/**
 * Log seviyeleri
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  context?: string;
  data?: unknown;
}

/**
 * Logger konfigürasyonu
 */
export interface LoggerConfig {
  /** Minimum log seviyesi */
  level?: LogLevel;
  /** Logger adı/context */
  context?: string;
  /** Custom log handler */
  handler?: (entry: LogEntry) => void;
  /** Timestamp formatı */
  timestampFormat?: 'iso' | 'locale' | 'unix';
  /** Hassas verileri maskele */
  maskSensitiveData?: boolean;
}

/**
 * Hassas veri pattern'leri
 */
const SENSITIVE_PATTERNS = [
  /password["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi,
  /token["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi,
  /secret["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi,
  /authorization["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi,
  /api[_-]?key["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi,
];

/**
 * Hassas verileri maskeler
 */
function maskSensitive(data: unknown): unknown {
  if (typeof data === 'string') {
    let masked = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, (match) => {
        const colonIndex = match.indexOf(':');
        const equalIndex = match.indexOf('=');
        const splitIndex = colonIndex > -1 ? colonIndex : equalIndex;
        if (splitIndex > -1) {
          return match.substring(0, splitIndex + 1) + ' [MASKED]';
        }
        return '[MASKED]';
      });
    }
    return masked;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitive);
  }

  if (data && typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key')
      ) {
        masked[key] = '[MASKED]';
      } else {
        masked[key] = maskSensitive(value);
      }
    }
    return masked;
  }

  return data;
}

/**
 * Timestamp formatlar
 */
function formatTimestamp(date: Date, format: 'iso' | 'locale' | 'unix'): string {
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'locale':
      return date.toLocaleString();
    case 'unix':
      return date.getTime().toString();
    default:
      return date.toISOString();
  }
}

/**
 * Level adı
 */
function levelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Console renkleri (ANSI)
 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  dim: '\x1b[2m',
};

/**
 * Logger sınıfı
 */
export class Logger {
  private level: LogLevel;
  private context?: string;
  private handler?: (entry: LogEntry) => void;
  private timestampFormat: 'iso' | 'locale' | 'unix';
  private maskSensitiveData: boolean;

  constructor(config: LoggerConfig = {}) {
    this.level = config.level ?? LogLevel.INFO;
    this.context = config.context;
    this.handler = config.handler;
    this.timestampFormat = config.timestampFormat || 'iso';
    this.maskSensitiveData = config.maskSensitiveData ?? true;
  }

  /**
   * Log seviyesini değiştirir
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log entry oluşturur ve işler
   */
  protected log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      message,
      context: this.context,
      data: this.maskSensitiveData ? maskSensitive(data) : data,
    };

    if (this.handler) {
      this.handler(entry);
    } else {
      this.defaultHandler(entry);
    }
  }

  /**
   * Varsayılan console handler
   */
  private defaultHandler(entry: LogEntry): void {
    const timestamp = formatTimestamp(entry.timestamp, this.timestampFormat);
    const level = levelName(entry.level);
    const context = entry.context ? `[${entry.context}]` : '';

    let color: string;
    switch (entry.level) {
      case LogLevel.DEBUG:
        color = COLORS.debug;
        break;
      case LogLevel.INFO:
        color = COLORS.info;
        break;
      case LogLevel.WARN:
        color = COLORS.warn;
        break;
      case LogLevel.ERROR:
        color = COLORS.error;
        break;
      default:
        color = COLORS.reset;
    }

    const prefix = `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${level}${COLORS.reset}${context ? ` ${COLORS.dim}${context}${COLORS.reset}` : ''}`;

    if (entry.data !== undefined) {
      console.log(`${prefix} ${entry.message}`, entry.data);
    } else {
      console.log(`${prefix} ${entry.message}`);
    }
  }

  /**
   * Debug log
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info log
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning log
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error log
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Child logger oluşturur (context ekleyerek)
   */
  child(context: string): Logger {
    return new Logger({
      level: this.level,
      context: this.context ? `${this.context}:${context}` : context,
      handler: this.handler,
      timestampFormat: this.timestampFormat,
      maskSensitiveData: this.maskSensitiveData,
    });
  }
}

/**
 * Request/Response logger
 */
export class HttpLogger extends Logger {
  constructor(config: LoggerConfig = {}) {
    super({ ...config, context: config.context || 'HTTP' });
  }

  /**
   * Request loglar
   */
  request(method: string, url: string, data?: unknown): void {
    this.debug(`→ ${method} ${url}`, data);
  }

  /**
   * Response loglar
   */
  response(method: string, url: string, status: number, duration: number, data?: unknown): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log(level, `← ${method} ${url} ${status} (${duration}ms)`, data);
  }

  /**
   * Error loglar
   */
  requestError(method: string, url: string, error: Error): void {
    this.error(`✕ ${method} ${url}`, { error: error.message });
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger({ context: 'ETS' });

/**
 * Debug mode'u açar/kapar
 */
export function setDebugMode(enabled: boolean): void {
  logger.setLevel(enabled ? LogLevel.DEBUG : LogLevel.INFO);
}

/**
 * Logger factory
 */
export function createLogger(context: string, config: Omit<LoggerConfig, 'context'> = {}): Logger {
  return new Logger({ ...config, context });
}
