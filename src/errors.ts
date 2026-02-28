/**
 * ETS API hata sınıfı
 */
export class EtsError extends Error {
  /** HTTP durum kodu */
  public readonly statusCode?: number;
  /** API hata kodu */
  public readonly code?: string;
  /** API yanıtı */
  public readonly response?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      response?: unknown;
    }
  ) {
    super(message);
    this.name = 'EtsError';
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.response = options?.response;

    // V8 stack trace desteği
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EtsError);
    }
  }
}

/**
 * Kimlik doğrulama hatası
 */
export class AuthenticationError extends EtsError {
  constructor(message: string = 'Kimlik doğrulama başarısız') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Yetkilendirme hatası
 */
export class AuthorizationError extends EtsError {
  constructor(message: string = 'Bu işlem için yetkiniz yok') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Doğrulama hatası
 */
export class ValidationError extends EtsError {
  /** Hatalı alanlar */
  public readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * GİB hatası
 */
export class GibError extends EtsError {
  /** GİB hata kodu */
  public readonly gibCode?: string;

  constructor(message: string, gibCode?: string) {
    super(message, { code: gibCode });
    this.name = 'GibError';
    this.gibCode = gibCode;
  }
}

/**
 * Bilinen GİB hata kodları
 */
export const GIB_ERROR_CODES = {
  /** Gönderici VKN uyuşmazlığı */
  '11204': 'Gönderici VKN uyuşmazlığı',
  /** TaxExemptionReason/TaxExemptionReasonCode tutarsızlığı */
  '11221': 'Vergi muafiyet sebebi ve kodu tutarsız',
  /** Fatura numarası daha önce kullanılmış */
  '11603': 'Fatura numarası daha önce kullanılmış',
} as const;
