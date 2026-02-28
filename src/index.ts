/**
 * Entegre ETS SDK
 *
 * E-Fatura, E-Arşiv, E-İrsaliye ve E-Müstahsil işlemleri için TypeScript/JavaScript SDK.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { EtsClient, UNIT_CODES, TAX_CODES } from '@entegre/ets-sdk';
 *
 * const client = new EtsClient({
 *   baseUrl: 'https://ets.bulutix.com',
 *   integrator: 'UYM'
 * });
 *
 * // Kimlik doğrulama
 * await client.authenticate({
 *   partyId: '1234567890',
 *   username: 'user',
 *   password: 'pass'
 * });
 *
 * // E-Fatura gönder
 * const result = await client.sendInvoice({
 *   Invoice: {
 *     InvoiceTypeCode: 'SATIS',
 *     ProfileId: 'TEMELFATURA',
 *     IssueDate: '2024-01-15',
 *     SupplierParty: { ... },
 *     CustomerParty: { ... },
 *     DocumentLines: [{
 *       ItemCode: 'URUN-001',
 *       ItemName: 'Ürün',
 *       InvoicedQuantity: 1,
 *       IsoUnitCode: UNIT_CODES.ADET,
 *       Price: 100,
 *       Taxes: [{ TaxCode: TAX_CODES.KDV, TaxName: 'KDV', Percent: 20, TaxAmount: 20 }]
 *     }],
 *     LegalMonetaryTotal: { LineExtensionAmount: 100, TaxIncludedAmount: 120, PayableAmount: 120 }
 *   }
 * });
 *
 * console.log('UUID:', result.data?.uuid);
 * ```
 */

// Client
export { EtsClient, createEtsClient } from './client';

// Types
export type {
  // Config & Auth
  Integrator,
  EtsClientConfig,
  AuthCredentials,
  ApiResponse,

  // Common
  Address,
  Person,
  Party,
  TargetCustomer,
  Tax,
  DocumentLine,
  LegalMonetaryTotal,
  UserCheckResult,
  UserAlias,
  UserAliasResult,
  ExchangeRate,
  PdfResult,

  // Invoice
  InvoiceTypeCode,
  InvoiceProfileId,
  Invoice,
  InvoiceRequest,
  InvoiceResult,
  InvoiceStatus,
  InvoiceListQuery,
  InvoiceListItem,
  ResponseType,
  RespondRequest,

  // Archive
  SendingType,
  ArchiveInfo,
  ArchiveInvoiceRequest,
  ArchiveInvoiceResult,
  ArchiveInvoiceStatus,
  ArchiveListQuery,
  ArchiveListItem,
  ArchiveCancelRequest,

  // Dispatch
  DispatchTypeCode,
  DispatchProfileId,
  Dispatch,
  DispatchRequest,
  DispatchResult,
  DispatchStatus,

  // Producer Receipt
  ProducerReceiptProfileId,
  ProducerReceipt,
  ProducerReceiptRequest,
  ProducerReceiptResult,
  ProducerReceiptStatus,
} from './types';

// Enums
export { InvoiceStatusCode } from './types';

// Errors
export {
  EtsError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  GibError,
  GIB_ERROR_CODES,
} from './errors';

// Constants
export {
  API_URLS,
  UNIT_CODES,
  TAX_CODES,
  INVOICE_TYPES,
  INVOICE_PROFILES,
  DISPATCH_PROFILES,
  PRODUCER_RECEIPT_PROFILES,
  CURRENCIES,
  INTEGRATORS,
} from './constants';

// Builders
export {
  InvoiceBuilder,
  createInvoice,
  DispatchBuilder,
  createDispatch,
  ProducerReceiptBuilder,
  createProducerReceipt,
  type LineInput,
  type PartyInput,
  type CalculatedTotals,
  type DispatchLineInput,
} from './builders';

// Validation
export {
  validateVKN,
  validateTCKN,
  validateTaxId,
  validateDate,
  validateCurrency,
  validateEmail,
  validateIBAN,
  validatePositiveNumber,
  combineValidations,
  Validator,
  type FieldError,
  type ValidationResult,
} from './validation';
