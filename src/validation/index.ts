/**
 * Doğrulama hataları
 */
export interface FieldError {
  /** Hata kodu */
  code: string;
  /** Hata mesajı */
  message: string;
  /** Hatalı alan */
  field?: string;
}

/**
 * Doğrulama sonucu
 */
export interface ValidationResult {
  /** Doğrulama başarılı mı? */
  valid: boolean;
  /** Hatalar listesi */
  errors: FieldError[];
}

/**
 * VKN (Vergi Kimlik Numarası) doğrulama
 * 10 haneli olmalı ve algoritma kontrolünden geçmeli
 */
export function validateVKN(vkn: string): ValidationResult {
  const errors: FieldError[] = [];

  if (!vkn) {
    errors.push({ code: 'VKN_REQUIRED', message: 'VKN gerekli', field: 'vkn' });
    return { valid: false, errors };
  }

  // Sadece rakam olmalı
  if (!/^\d+$/.test(vkn)) {
    errors.push({ code: 'VKN_INVALID_CHARS', message: 'VKN sadece rakam içermeli', field: 'vkn' });
    return { valid: false, errors };
  }

  // 10 haneli olmalı
  if (vkn.length !== 10) {
    errors.push({ code: 'VKN_INVALID_LENGTH', message: 'VKN 10 haneli olmalı', field: 'vkn' });
    return { valid: false, errors };
  }

  // VKN algoritma kontrolü
  const digits = vkn.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    sum += (tmp * Math.pow(2, 9 - i)) % 9;
    if (tmp !== 0 && (tmp * Math.pow(2, 9 - i)) % 9 === 0) {
      sum += 9;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  if (checkDigit !== digits[9]) {
    errors.push({ code: 'VKN_INVALID_CHECKSUM', message: 'Geçersiz VKN', field: 'vkn' });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * TCKN (TC Kimlik Numarası) doğrulama
 * 11 haneli olmalı ve algoritma kontrolünden geçmeli
 */
export function validateTCKN(tckn: string): ValidationResult {
  const errors: FieldError[] = [];

  if (!tckn) {
    errors.push({ code: 'TCKN_REQUIRED', message: 'TCKN gerekli', field: 'tckn' });
    return { valid: false, errors };
  }

  // Sadece rakam olmalı
  if (!/^\d+$/.test(tckn)) {
    errors.push({ code: 'TCKN_INVALID_CHARS', message: 'TCKN sadece rakam içermeli', field: 'tckn' });
    return { valid: false, errors };
  }

  // 11 haneli olmalı
  if (tckn.length !== 11) {
    errors.push({ code: 'TCKN_INVALID_LENGTH', message: 'TCKN 11 haneli olmalı', field: 'tckn' });
    return { valid: false, errors };
  }

  // İlk hane 0 olamaz
  if (tckn[0] === '0') {
    errors.push({ code: 'TCKN_INVALID_FIRST_DIGIT', message: 'TCKN 0 ile başlayamaz', field: 'tckn' });
    return { valid: false, errors };
  }

  const digits = tckn.split('').map(Number);

  // 10. hane kontrolü: ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) % 10 = d10
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = (oddSum * 7 - evenSum) % 10;

  if (check10 < 0 ? check10 + 10 : check10 !== digits[9]) {
    errors.push({ code: 'TCKN_INVALID_CHECKSUM', message: 'Geçersiz TCKN', field: 'tckn' });
    return { valid: false, errors };
  }

  // 11. hane kontrolü: (d1+d2+d3+d4+d5+d6+d7+d8+d9+d10) % 10 = d11
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const check11 = sumFirst10 % 10;

  if (check11 !== digits[10]) {
    errors.push({ code: 'TCKN_INVALID_CHECKSUM', message: 'Geçersiz TCKN', field: 'tckn' });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * VKN veya TCKN otomatik doğrulama
 * 10 haneli ise VKN, 11 haneli ise TCKN olarak kontrol eder
 */
export function validateTaxId(taxId: string): ValidationResult {
  if (!taxId) {
    return {
      valid: false,
      errors: [{ code: 'TAX_ID_REQUIRED', message: 'VKN veya TCKN gerekli', field: 'taxId' }],
    };
  }

  // Sadece rakam olmalı
  if (!/^\d+$/.test(taxId)) {
    return {
      valid: false,
      errors: [{ code: 'TAX_ID_INVALID_CHARS', message: 'VKN/TCKN sadece rakam içermeli', field: 'taxId' }],
    };
  }

  if (taxId.length === 10) {
    return validateVKN(taxId);
  } else if (taxId.length === 11) {
    return validateTCKN(taxId);
  } else {
    return {
      valid: false,
      errors: [{ code: 'TAX_ID_INVALID_LENGTH', message: 'VKN 10, TCKN 11 haneli olmalı', field: 'taxId' }],
    };
  }
}

/**
 * Tarih formatı doğrulama (YYYY-MM-DD)
 */
export function validateDate(date: string): ValidationResult {
  const errors: FieldError[] = [];

  if (!date) {
    errors.push({ code: 'DATE_REQUIRED', message: 'Tarih gerekli', field: 'date' });
    return { valid: false, errors };
  }

  // Format kontrolü
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push({ code: 'DATE_INVALID_FORMAT', message: 'Tarih YYYY-MM-DD formatında olmalı', field: 'date' });
    return { valid: false, errors };
  }

  // Geçerli tarih mi?
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    errors.push({ code: 'DATE_INVALID', message: 'Geçersiz tarih', field: 'date' });
    return { valid: false, errors };
  }

  // Tarih parçalarını kontrol et
  const [year, month, day] = date.split('-').map(Number);
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) {
    errors.push({ code: 'DATE_INVALID', message: 'Geçersiz tarih', field: 'date' });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Para birimi kodu doğrulama (ISO 4217)
 */
export function validateCurrency(currency: string): ValidationResult {
  const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'RUB', 'SAR', 'AED', 'AZN', 'KWD', 'QAR'];

  if (!currency) {
    return {
      valid: false,
      errors: [{ code: 'CURRENCY_REQUIRED', message: 'Para birimi gerekli', field: 'currency' }],
    };
  }

  if (!validCurrencies.includes(currency.toUpperCase())) {
    return {
      valid: false,
      errors: [
        { code: 'CURRENCY_INVALID', message: `Geçersiz para birimi. Geçerli değerler: ${validCurrencies.join(', ')}`, field: 'currency' },
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * E-posta doğrulama
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return {
      valid: false,
      errors: [{ code: 'EMAIL_REQUIRED', message: 'E-posta gerekli', field: 'email' }],
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      errors: [{ code: 'EMAIL_INVALID', message: 'Geçersiz e-posta formatı', field: 'email' }],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * IBAN doğrulama (Türkiye)
 */
export function validateIBAN(iban: string): ValidationResult {
  const errors: FieldError[] = [];

  if (!iban) {
    errors.push({ code: 'IBAN_REQUIRED', message: 'IBAN gerekli', field: 'iban' });
    return { valid: false, errors };
  }

  // Boşlukları temizle ve büyük harfe çevir
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  // Türkiye IBAN formatı: TR + 2 check digit + 5 bank code + 1 reserve + 16 account
  if (!/^TR\d{24}$/.test(cleanIban)) {
    errors.push({ code: 'IBAN_INVALID_FORMAT', message: 'Geçersiz IBAN formatı (TR + 24 rakam)', field: 'iban' });
    return { valid: false, errors };
  }

  // IBAN algoritma kontrolü
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
  const numericIban = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

  // Mod 97 kontrolü (büyük sayı için string işlemi)
  let remainder = '';
  for (const digit of numericIban) {
    remainder = ((parseInt(remainder + digit, 10)) % 97).toString();
  }

  if (parseInt(remainder, 10) !== 1) {
    errors.push({ code: 'IBAN_INVALID_CHECKSUM', message: 'Geçersiz IBAN', field: 'iban' });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Pozitif sayı doğrulama
 */
export function validatePositiveNumber(value: number, fieldName: string = 'value'): ValidationResult {
  if (value === undefined || value === null) {
    return {
      valid: false,
      errors: [{ code: 'NUMBER_REQUIRED', message: `${fieldName} gerekli`, field: fieldName }],
    };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errors: [{ code: 'NUMBER_INVALID', message: `${fieldName} geçerli bir sayı olmalı`, field: fieldName }],
    };
  }

  if (value <= 0) {
    return {
      valid: false,
      errors: [{ code: 'NUMBER_NOT_POSITIVE', message: `${fieldName} pozitif olmalı`, field: fieldName }],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Birden fazla doğrulamayı birleştirir
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors: FieldError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validator helper sınıfı - zincirleme doğrulama için
 */
export class Validator {
  private errors: FieldError[] = [];

  /**
   * VKN doğrula
   */
  vkn(value: string, field: string = 'vkn'): this {
    const result = validateVKN(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * TCKN doğrula
   */
  tckn(value: string, field: string = 'tckn'): this {
    const result = validateTCKN(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * VKN veya TCKN doğrula
   */
  taxId(value: string, field: string = 'taxId'): this {
    const result = validateTaxId(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * Tarih doğrula
   */
  date(value: string, field: string = 'date'): this {
    const result = validateDate(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * Para birimi doğrula
   */
  currency(value: string, field: string = 'currency'): this {
    const result = validateCurrency(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * E-posta doğrula
   */
  email(value: string, field: string = 'email'): this {
    const result = validateEmail(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * IBAN doğrula
   */
  iban(value: string, field: string = 'iban'): this {
    const result = validateIBAN(value);
    this.errors.push(...result.errors.map((e) => ({ ...e, field })));
    return this;
  }

  /**
   * Pozitif sayı doğrula
   */
  positiveNumber(value: number, field: string = 'value'): this {
    const result = validatePositiveNumber(value, field);
    this.errors.push(...result.errors);
    return this;
  }

  /**
   * Zorunlu alan kontrolü
   */
  required(value: unknown, field: string): this {
    if (value === undefined || value === null || value === '') {
      this.errors.push({ code: 'REQUIRED', message: `${field} zorunlu`, field });
    }
    return this;
  }

  /**
   * Doğrulama sonucunu döndür
   */
  validate(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    };
  }

  /**
   * Hata varsa exception fırlat
   */
  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      const messages = this.errors.map((e) => `${e.field}: ${e.message}`);
      throw new Error(`Doğrulama hatası:\n- ${messages.join('\n- ')}`);
    }
  }

  /**
   * Yeni validator oluştur
   */
  static create(): Validator {
    return new Validator();
  }
}
