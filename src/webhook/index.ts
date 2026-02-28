import { createHmac } from 'crypto';

/**
 * Webhook event tipleri
 */
export type WebhookEventType =
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.delivered'
  | 'invoice.accepted'
  | 'invoice.rejected'
  | 'invoice.failed'
  | 'archive.created'
  | 'archive.sent'
  | 'archive.cancelled'
  | 'dispatch.created'
  | 'dispatch.sent'
  | 'dispatch.delivered'
  | 'receipt.created'
  | 'receipt.sent';

/**
 * Webhook payload
 */
export interface WebhookPayload {
  /** Event ID */
  id: string;
  /** Event tipi */
  event: WebhookEventType;
  /** Oluşturulma zamanı (ISO 8601) */
  timestamp: string;
  /** Belge UUID */
  documentUuid: string;
  /** Belge numarası */
  documentNumber?: string;
  /** Belge tipi */
  documentType: 'invoice' | 'archive' | 'dispatch' | 'receipt';
  /** Durum */
  status?: string;
  /** Ek veri */
  data?: Record<string, unknown>;
  /** Hata mesajı (başarısız durumlarda) */
  errorMessage?: string;
  /** Hata kodu */
  errorCode?: string;
}

/**
 * Webhook handler callback
 */
export type WebhookHandler = (payload: WebhookPayload) => void | Promise<void>;

/**
 * Webhook konfigürasyonu
 */
export interface WebhookConfig {
  /** Webhook secret (signature doğrulama için) */
  secret?: string;
  /** Signature header adı */
  signatureHeader?: string;
  /** Timestamp tolerance (ms) - replay attack koruması */
  timestampTolerance?: number;
}

const DEFAULT_SIGNATURE_HEADER = 'x-ets-signature';
const DEFAULT_TIMESTAMP_TOLERANCE = 5 * 60 * 1000; // 5 dakika

/**
 * Webhook signature doğrulama
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expectedSignature = createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Webhook payload parse
 */
export function parseWebhookPayload(body: string | Buffer | object): WebhookPayload {
  let parsed: unknown;

  if (typeof body === 'string') {
    parsed = JSON.parse(body);
  } else if (Buffer.isBuffer(body)) {
    parsed = JSON.parse(body.toString('utf-8'));
  } else {
    parsed = body;
  }

  const payload = parsed as WebhookPayload;

  // Zorunlu alanları kontrol et
  if (!payload.id || !payload.event || !payload.documentUuid) {
    throw new Error('Invalid webhook payload: missing required fields');
  }

  return payload;
}

/**
 * Timestamp doğrulama (replay attack koruması)
 */
export function validateTimestamp(timestamp: string, toleranceMs: number): boolean {
  const eventTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.abs(now - eventTime);

  return diff <= toleranceMs;
}

/**
 * Webhook Router - Event bazlı handler yönetimi
 */
export class WebhookRouter {
  private handlers: Map<WebhookEventType | '*', WebhookHandler[]> = new Map();
  private config: Required<WebhookConfig>;

  constructor(config: WebhookConfig = {}) {
    this.config = {
      secret: config.secret || '',
      signatureHeader: config.signatureHeader || DEFAULT_SIGNATURE_HEADER,
      timestampTolerance: config.timestampTolerance || DEFAULT_TIMESTAMP_TOLERANCE,
    };
  }

  /**
   * Event handler ekler
   */
  on(event: WebhookEventType | '*', handler: WebhookHandler): this {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    return this;
  }

  /**
   * Belirli bir event için handler'ı kaldırır
   */
  off(event: WebhookEventType | '*', handler: WebhookHandler): this {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Fatura event'leri için handler
   */
  onInvoice(handler: WebhookHandler): this {
    return this
      .on('invoice.created', handler)
      .on('invoice.sent', handler)
      .on('invoice.delivered', handler)
      .on('invoice.accepted', handler)
      .on('invoice.rejected', handler)
      .on('invoice.failed', handler);
  }

  /**
   * E-Arşiv event'leri için handler
   */
  onArchive(handler: WebhookHandler): this {
    return this
      .on('archive.created', handler)
      .on('archive.sent', handler)
      .on('archive.cancelled', handler);
  }

  /**
   * İrsaliye event'leri için handler
   */
  onDispatch(handler: WebhookHandler): this {
    return this
      .on('dispatch.created', handler)
      .on('dispatch.sent', handler)
      .on('dispatch.delivered', handler);
  }

  /**
   * Webhook'u işler
   */
  async handle(
    body: string | Buffer | object,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookPayload> {
    // Signature doğrulama
    if (this.config.secret && headers) {
      const signature = headers[this.config.signatureHeader];
      const signatureStr = Array.isArray(signature) ? signature[0] : signature;

      if (!signatureStr) {
        throw new Error('Missing webhook signature');
      }

      const bodyStr = typeof body === 'string' ? body :
                      Buffer.isBuffer(body) ? body.toString('utf-8') :
                      JSON.stringify(body);

      if (!verifyWebhookSignature(bodyStr, signatureStr, this.config.secret)) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Payload parse
    const payload = parseWebhookPayload(body);

    // Timestamp doğrulama
    if (payload.timestamp && !validateTimestamp(payload.timestamp, this.config.timestampTolerance)) {
      throw new Error('Webhook timestamp out of tolerance');
    }

    // Handler'ları çağır
    const specificHandlers = this.handlers.get(payload.event) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      await handler(payload);
    }

    return payload;
  }

  /**
   * Express/Koa middleware oluşturur
   */
  middleware() {
    return async (req: { body: unknown; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }, next?: () => void) => {
      try {
        const payload = await this.handle(req.body as string | Buffer | object, req.headers);
        res.status(200).json({ received: true, id: payload.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: message });
      }
    };
  }
}

/**
 * Webhook router factory
 */
export function createWebhookRouter(config?: WebhookConfig): WebhookRouter {
  return new WebhookRouter(config);
}

/**
 * Basit webhook handler oluşturur (middleware olmadan)
 */
export function createWebhookHandler(
  handlers: Partial<Record<WebhookEventType, WebhookHandler>>,
  config?: WebhookConfig
): (body: string | Buffer | object, headers?: Record<string, string | string[] | undefined>) => Promise<WebhookPayload> {
  const router = new WebhookRouter(config);

  for (const [event, handler] of Object.entries(handlers)) {
    if (handler) {
      router.on(event as WebhookEventType, handler);
    }
  }

  return (body, headers) => router.handle(body, headers);
}
