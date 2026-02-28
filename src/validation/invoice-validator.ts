/**
 * Fatura Ön-doğrulama
 *
 * GİB kurallarına uygun fatura doğrulama.
 * Fatura göndermeden önce potansiyel hataları tespit eder.
 *
 * @example
 * ```typescript
 * import { validateInvoice } from '@entegre/ets-sdk';
 *
 * const request = InvoiceBuilder.create()
 *   .withType('SATIS')
 *   .withCustomer({ taxId: '1234567890', name: 'Test' })
 *   .build();
 *
 * const result = validateInvoice(request);
 *
 * if (!result.valid) {
 *   console.log('Hatalar:', result.errors);
 *   console.log('Uyarılar:', result.warnings);
 * }
 * ```
 */

import type { InvoiceRequest, ArchiveInvoiceRequest, DocumentLine, Party } from '../types';
import { validateTaxId, validateDate, type FieldError } from './index';

/**
 * Doğrulama seçenekleri
 */
export interface InvoiceValidationOptions {
  /** Hesaplama kontrollerini atla */
  skipCalculationCheck?: boolean;
  /** Tarih kontrollerini atla */
  skipDateCheck?: boolean;
  /** Özel doğrulama kuralları */
  customRules?: InvoiceValidationRule[];
}

/**
 * Özel doğrulama kuralı
 */
export interface InvoiceValidationRule {
  /** Kural adı */
  name: string;
  /** Doğrulama fonksiyonu */
  validate: (request: InvoiceRequest) => FieldError[];
}

/**
 * Fatura doğrulama sonucu
 */
export interface InvoiceValidationResult {
  /** Doğrulama başarılı mı? */
  valid: boolean;
  /** Kritik hatalar (fatura gönderilemez) */
  errors: FieldError[];
  /** Uyarılar (fatura gönderilebilir ama dikkat edilmeli) */
  warnings: FieldError[];
  /** Öneriler */
  suggestions: string[];
}

/**
 * Doğrulama hata kodları
 */
export const VALIDATION_ERROR_CODES = {
  // Zorunlu alanlar
  ISSUE_DATE_REQUIRED: 'ISSUE_DATE_REQUIRED',
  INVOICE_TYPE_REQUIRED: 'INVOICE_TYPE_REQUIRED',
  PROFILE_ID_REQUIRED: 'PROFILE_ID_REQUIRED',
  SUPPLIER_REQUIRED: 'SUPPLIER_REQUIRED',
  CUSTOMER_REQUIRED: 'CUSTOMER_REQUIRED',
  LINES_REQUIRED: 'LINES_REQUIRED',

  // Taraf doğrulama
  SUPPLIER_TAX_ID_INVALID: 'SUPPLIER_TAX_ID_INVALID',
  CUSTOMER_TAX_ID_INVALID: 'CUSTOMER_TAX_ID_INVALID',
  SUPPLIER_NAME_REQUIRED: 'SUPPLIER_NAME_REQUIRED',
  CUSTOMER_NAME_REQUIRED: 'CUSTOMER_NAME_REQUIRED',

  // Satır doğrulama
  LINE_ITEM_NAME_REQUIRED: 'LINE_ITEM_NAME_REQUIRED',
  LINE_QUANTITY_INVALID: 'LINE_QUANTITY_INVALID',
  LINE_PRICE_INVALID: 'LINE_PRICE_INVALID',
  LINE_UNIT_CODE_REQUIRED: 'LINE_UNIT_CODE_REQUIRED',

  // Hesaplama
  CALCULATION_MISMATCH: 'CALCULATION_MISMATCH',
  TAX_AMOUNT_MISMATCH: 'TAX_AMOUNT_MISMATCH',

  // Tarih
  DATE_IN_FUTURE: 'DATE_IN_FUTURE',
  DATE_TOO_OLD: 'DATE_TOO_OLD',
  DATE_INVALID_FORMAT: 'DATE_INVALID_FORMAT',

  // İş kuralları
  WITHHOLDING_REQUIRED: 'WITHHOLDING_REQUIRED',
  EXPORT_COUNTRY_REQUIRED: 'EXPORT_COUNTRY_REQUIRED',
  EXEMPTION_REASON_REQUIRED: 'EXEMPTION_REASON_REQUIRED',
  ARCHIVE_SENDING_TYPE_REQUIRED: 'ARCHIVE_SENDING_TYPE_REQUIRED',
} as const;

/**
 * Fatura doğrulama fonksiyonu
 *
 * GİB kurallarına uygun fatura doğrulama yapar.
 *
 * @param request - Fatura isteği
 * @param options - Doğrulama seçenekleri
 *
 * @example
 * ```typescript
 * const result = validateInvoice(invoiceRequest);
 *
 * if (!result.valid) {
 *   console.log('Hatalar:', result.errors);
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.log('Uyarılar:', result.warnings);
 * }
 * ```
 */
export function validateInvoice(
  request: InvoiceRequest | ArchiveInvoiceRequest,
  options: InvoiceValidationOptions = {}
): InvoiceValidationResult {
  const errors: FieldError[] = [];
  const warnings: FieldError[] = [];
  const suggestions: string[] = [];

  const invoice = request.Invoice;

  // 1. Zorunlu alanlar
  validateRequiredFields(invoice, errors);

  // 2. Taraf doğrulama
  if (invoice.SupplierParty) {
    validateParty(invoice.SupplierParty, 'supplier', errors);
  }
  if (invoice.CustomerParty) {
    validateParty(invoice.CustomerParty, 'customer', errors);
  }

  // 3. Satır doğrulama
  if (invoice.DocumentLines && invoice.DocumentLines.length > 0) {
    validateLines(invoice.DocumentLines, errors, warnings);
  }

  // 4. Hesaplama kontrolü
  if (!options.skipCalculationCheck && invoice.DocumentLines && invoice.LegalMonetaryTotal) {
    validateCalculations(invoice.DocumentLines, invoice.LegalMonetaryTotal, errors, warnings);
  }

  // 5. Tarih kontrolü
  if (!options.skipDateCheck && invoice.IssueDate) {
    validateInvoiceDate(invoice.IssueDate, errors, warnings, suggestions);
  }

  // 6. İş kuralları
  validateBusinessRules(request, errors, warnings, suggestions);

  // 7. Özel kurallar
  if (options.customRules) {
    for (const rule of options.customRules) {
      const ruleErrors = rule.validate(request);
      errors.push(...ruleErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Zorunlu alan kontrolü
 */
function validateRequiredFields(
  invoice: InvoiceRequest['Invoice'],
  errors: FieldError[]
): void {
  if (!invoice.IssueDate) {
    errors.push({
      code: VALIDATION_ERROR_CODES.ISSUE_DATE_REQUIRED,
      message: 'Fatura tarihi zorunludur',
      field: 'Invoice.IssueDate',
    });
  }

  if (!invoice.InvoiceTypeCode) {
    errors.push({
      code: VALIDATION_ERROR_CODES.INVOICE_TYPE_REQUIRED,
      message: 'Fatura tipi zorunludur',
      field: 'Invoice.InvoiceTypeCode',
    });
  }

  if (!invoice.ProfileId) {
    errors.push({
      code: VALIDATION_ERROR_CODES.PROFILE_ID_REQUIRED,
      message: 'Fatura profili zorunludur',
      field: 'Invoice.ProfileId',
    });
  }

  if (!invoice.SupplierParty) {
    errors.push({
      code: VALIDATION_ERROR_CODES.SUPPLIER_REQUIRED,
      message: 'Satıcı bilgisi zorunludur',
      field: 'Invoice.SupplierParty',
    });
  }

  if (!invoice.CustomerParty) {
    errors.push({
      code: VALIDATION_ERROR_CODES.CUSTOMER_REQUIRED,
      message: 'Alıcı bilgisi zorunludur',
      field: 'Invoice.CustomerParty',
    });
  }

  if (!invoice.DocumentLines || invoice.DocumentLines.length === 0) {
    errors.push({
      code: VALIDATION_ERROR_CODES.LINES_REQUIRED,
      message: 'En az bir fatura kalemi zorunludur',
      field: 'Invoice.DocumentLines',
    });
  }
}

/**
 * Taraf doğrulama
 */
function validateParty(party: Party, type: 'supplier' | 'customer', errors: FieldError[]): void {
  const fieldPrefix = type === 'supplier' ? 'Invoice.SupplierParty' : 'Invoice.CustomerParty';
  const label = type === 'supplier' ? 'Satıcı' : 'Alıcı';

  if (!party.PartyIdentification) {
    errors.push({
      code: type === 'supplier' ? VALIDATION_ERROR_CODES.SUPPLIER_TAX_ID_INVALID : VALIDATION_ERROR_CODES.CUSTOMER_TAX_ID_INVALID,
      message: `${label} VKN/TCKN zorunludur`,
      field: `${fieldPrefix}.PartyIdentification`,
    });
  } else {
    const taxIdResult = validateTaxId(party.PartyIdentification);
    if (!taxIdResult.valid) {
      errors.push({
        code: type === 'supplier' ? VALIDATION_ERROR_CODES.SUPPLIER_TAX_ID_INVALID : VALIDATION_ERROR_CODES.CUSTOMER_TAX_ID_INVALID,
        message: `${label} ${taxIdResult.errors[0]?.message || 'Geçersiz VKN/TCKN'}`,
        field: `${fieldPrefix}.PartyIdentification`,
      });
    }
  }

  if (!party.PartyName) {
    errors.push({
      code: type === 'supplier' ? VALIDATION_ERROR_CODES.SUPPLIER_NAME_REQUIRED : VALIDATION_ERROR_CODES.CUSTOMER_NAME_REQUIRED,
      message: `${label} unvanı zorunludur`,
      field: `${fieldPrefix}.PartyName`,
    });
  }
}

/**
 * Satır doğrulama
 */
function validateLines(lines: DocumentLine[], errors: FieldError[], warnings: FieldError[]): void {
  lines.forEach((line, index) => {
    const fieldPrefix = `Invoice.DocumentLines[${index}]`;

    if (!line.ItemName || line.ItemName.trim() === '') {
      errors.push({
        code: VALIDATION_ERROR_CODES.LINE_ITEM_NAME_REQUIRED,
        message: `Satır ${index + 1}: Ürün/hizmet adı zorunludur`,
        field: `${fieldPrefix}.ItemName`,
      });
    }

    if (line.InvoicedQuantity === undefined || line.InvoicedQuantity <= 0) {
      errors.push({
        code: VALIDATION_ERROR_CODES.LINE_QUANTITY_INVALID,
        message: `Satır ${index + 1}: Miktar 0'dan büyük olmalıdır`,
        field: `${fieldPrefix}.InvoicedQuantity`,
      });
    }

    if (line.Price === undefined || line.Price < 0) {
      errors.push({
        code: VALIDATION_ERROR_CODES.LINE_PRICE_INVALID,
        message: `Satır ${index + 1}: Birim fiyat 0 veya daha büyük olmalıdır`,
        field: `${fieldPrefix}.Price`,
      });
    }

    if (!line.IsoUnitCode) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.LINE_UNIT_CODE_REQUIRED,
        message: `Satır ${index + 1}: Birim kodu belirtilmemiş, varsayılan C62 (Adet) kullanılacak`,
        field: `${fieldPrefix}.IsoUnitCode`,
      });
    }

    // Vergi kontrolü
    if (!line.Taxes || line.Taxes.length === 0) {
      warnings.push({
        code: 'LINE_TAX_MISSING',
        message: `Satır ${index + 1}: Vergi bilgisi belirtilmemiş`,
        field: `${fieldPrefix}.Taxes`,
      });
    }
  });
}

/**
 * Hesaplama doğrulama
 */
function validateCalculations(
  lines: DocumentLine[],
  totals: InvoiceRequest['Invoice']['LegalMonetaryTotal'],
  errors: FieldError[],
  warnings: FieldError[]
): void {
  // Satır toplamını hesapla
  let calculatedLineTotal = 0;
  let calculatedTaxTotal = 0;

  for (const line of lines) {
    const lineAmount = line.LineExtensionAmount ?? (line.InvoicedQuantity * line.Price);
    calculatedLineTotal += lineAmount;

    if (line.Taxes) {
      for (const tax of line.Taxes) {
        calculatedTaxTotal += tax.TaxAmount;
      }
    }
  }

  // Yuvarlama toleransı
  const tolerance = 0.02;

  // Satır toplamı kontrolü
  if (totals.LineExtensionAmount !== undefined) {
    const diff = Math.abs(calculatedLineTotal - totals.LineExtensionAmount);
    if (diff > tolerance) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.CALCULATION_MISMATCH,
        message: `Satır toplamı uyuşmazlığı: Hesaplanan ${calculatedLineTotal.toFixed(2)}, Belirtilen ${totals.LineExtensionAmount}`,
        field: 'Invoice.LegalMonetaryTotal.LineExtensionAmount',
      });
    }
  }

  // KDV dahil toplam kontrolü
  if (totals.TaxIncludedAmount !== undefined) {
    const calculatedTotal = calculatedLineTotal + calculatedTaxTotal;
    const diff = Math.abs(calculatedTotal - totals.TaxIncludedAmount);
    if (diff > tolerance) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.CALCULATION_MISMATCH,
        message: `KDV dahil toplam uyuşmazlığı: Hesaplanan ${calculatedTotal.toFixed(2)}, Belirtilen ${totals.TaxIncludedAmount}`,
        field: 'Invoice.LegalMonetaryTotal.TaxIncludedAmount',
      });
    }
  }
}

/**
 * Tarih doğrulama
 */
function validateInvoiceDate(
  issueDate: string,
  errors: FieldError[],
  warnings: FieldError[],
  suggestions: string[]
): void {
  // Format kontrolü
  const dateResult = validateDate(issueDate);
  if (!dateResult.valid) {
    errors.push({
      code: VALIDATION_ERROR_CODES.DATE_INVALID_FORMAT,
      message: dateResult.errors[0]?.message || 'Geçersiz tarih formatı',
      field: 'Invoice.IssueDate',
    });
    return;
  }

  const invoiceDate = new Date(issueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Gelecek tarih kontrolü
  if (invoiceDate >= tomorrow) {
    errors.push({
      code: VALIDATION_ERROR_CODES.DATE_IN_FUTURE,
      message: 'Fatura tarihi gelecekte olamaz',
      field: 'Invoice.IssueDate',
    });
  }

  // 7 günden eski fatura uyarısı
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (invoiceDate < sevenDaysAgo) {
    warnings.push({
      code: VALIDATION_ERROR_CODES.DATE_TOO_OLD,
      message: 'Fatura tarihi 7 günden eski. GİB tarafından reddedilebilir.',
      field: 'Invoice.IssueDate',
    });
    suggestions.push('Fatura tarihini güncelleyin veya GİB ile iletişime geçin.');
  }
}

/**
 * İş kuralları doğrulama
 */
function validateBusinessRules(
  request: InvoiceRequest | ArchiveInvoiceRequest,
  errors: FieldError[],
  warnings: FieldError[],
  suggestions: string[]
): void {
  const invoice = request.Invoice;

  // Tevkifat faturası kontrolü
  if (invoice.InvoiceTypeCode === 'TEVKIFAT') {
    const hasWithholdingTax = invoice.TaxTotals?.some(
      (tax) => tax.TaxCode === '9015' || tax.TaxName?.includes('Tevkifat')
    );

    if (!hasWithholdingTax) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.WITHHOLDING_REQUIRED,
        message: 'Tevkifat faturası için tevkifat vergisi tanımlanmalıdır',
        field: 'Invoice.TaxTotals',
      });
      suggestions.push('Tevkifat oranı ve sebebi ekleyin (örn: 9/10 Güvenlik Hizmetleri)');
    }
  }

  // İhracat faturası kontrolü
  if (invoice.ProfileId === 'IHRACAT') {
    const customerCountry = invoice.CustomerParty?.Address?.Country;
    if (!customerCountry || customerCountry.toUpperCase() === 'TR' || customerCountry.toUpperCase() === 'TÜRKIYE' || customerCountry.toUpperCase() === 'TÜRKİYE') {
      warnings.push({
        code: VALIDATION_ERROR_CODES.EXPORT_COUNTRY_REQUIRED,
        message: 'İhracat faturası için yabancı ülke belirtilmelidir',
        field: 'Invoice.CustomerParty.Address.Country',
      });
    }
  }

  // İstisna faturası kontrolü
  if (invoice.InvoiceTypeCode === 'ISTISNA') {
    const hasExemptionReason = invoice.DocumentLines?.some(
      (line) => line.Taxes?.some((tax) => tax.ExemptionReason && tax.ExemptionReasonCode)
    );

    if (!hasExemptionReason) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.EXEMPTION_REASON_REQUIRED,
        message: 'İstisna faturası için muafiyet sebebi ve kodu belirtilmelidir',
        field: 'Invoice.DocumentLines[].Taxes[].ExemptionReason',
      });
    }
  }

  // E-Arşiv gönderim tipi kontrolü
  if ('ArchiveInfo' in request) {
    const archiveRequest = request as ArchiveInvoiceRequest;
    if (!archiveRequest.ArchiveInfo?.SendingType) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.ARCHIVE_SENDING_TYPE_REQUIRED,
        message: 'E-Arşiv faturası için gönderim tipi belirtilmelidir',
        field: 'ArchiveInfo.SendingType',
      });
      suggestions.push('SendingType: "ELEKTRONIK" veya "KAGIT" olarak belirleyin');
    }
  }

  // Döviz kuru kontrolü
  const currency = invoice.DocumentCurrencyCode || invoice.CurrencyId;
  if (currency && currency !== 'TRY') {
    // Satırlardaki kur bilgisi kontrolü (opsiyonel uyarı)
    suggestions.push(`Döviz faturası için TCMB kurunu kullanabilirsiniz: tcmb.getInvoiceRate('${currency}')`);
  }
}

/**
 * Hızlı doğrulama - sadece kritik hataları kontrol eder
 *
 * @param request - Fatura isteği
 * @returns Geçerli mi?
 */
export function isValidInvoice(request: InvoiceRequest | ArchiveInvoiceRequest): boolean {
  const result = validateInvoice(request, {
    skipCalculationCheck: true,
    skipDateCheck: true,
  });
  return result.valid;
}

/**
 * Doğrulama hatalarını formatlı string olarak döner
 *
 * @param result - Doğrulama sonucu
 */
export function formatValidationResult(result: InvoiceValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ Fatura doğrulaması başarılı');
  } else {
    lines.push('✗ Fatura doğrulaması başarısız');
  }

  if (result.errors.length > 0) {
    lines.push('\nHatalar:');
    for (const error of result.errors) {
      lines.push(`  - [${error.code}] ${error.message}`);
      if (error.field) {
        lines.push(`    Alan: ${error.field}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\nUyarılar:');
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.code}] ${warning.message}`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push('\nÖneriler:');
    for (const suggestion of result.suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  return lines.join('\n');
}
