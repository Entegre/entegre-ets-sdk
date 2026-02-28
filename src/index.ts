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

  // Incoming Invoice
  IncomingInvoice,
  IncomingParty,
  IncomingInvoiceLine,
  IncomingInvoiceListQuery,
  IncomingInvoiceListResponse,
  InvoiceResponseRequest,
  InvoiceResponseResult,
  IncomingInvoiceStatus,

  // Auto-routing
  DocumentTypeRoute,
  AutoRouteResult,
  AutoRouteOptions,
  BulkStatusQuery,
  BulkStatusOptions,
  BulkStatusResult,
} from './types';

// Incoming Invoice Status Constants
export { INCOMING_INVOICE_STATUS } from './types';

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
  type WithholdingInfo,
  type DiscountInfo,
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

// Invoice Validation
export {
  validateInvoice,
  isValidInvoice,
  formatValidationResult,
  VALIDATION_ERROR_CODES,
  type InvoiceValidationResult,
  type InvoiceValidationOptions,
  type InvoiceValidationRule,
} from './validation/invoice-validator';

// TCMB Exchange Rates
export {
  TcmbService,
  tcmb,
  createTcmbService,
  type TcmbRate,
  type TcmbRatesResult,
  type TcmbServiceConfig,
} from './tcmb';

// Templates
export {
  salesInvoiceTemplate,
  returnInvoiceTemplate,
  withholdingInvoiceTemplate,
  exemptionInvoiceTemplate,
  exportInvoiceTemplate,
  eArchivePersonTemplate,
  commercialInvoiceTemplate,
  specialBaseInvoiceTemplate,
  EXEMPTION_CODES,
  WITHHOLDING_CODES,
  type TemplateOptions,
  type WithholdingTemplateOptions,
  type ExemptionTemplateOptions,
} from './templates';

// Invoice Templates (Quick Builders)
export {
  InvoiceTemplates,
  WithholdingCodes,
  ExemptionCodes,
} from './templates/invoice-templates';

// Parser
export {
  parseInvoiceXml,
  parseBase64InvoiceXml,
  toInvoice,
  isInvoiceXml,
  isDispatchXml,
  type ParsedInvoice,
} from './parser';

// Utilities
export {
  // Retry
  withRetry,
  isRetryableError,
  calculateDelay,
  type RetryConfig,

  // Cache
  MemoryCache,
  UserCache,
  ExchangeRateCache,
  userCache,
  exchangeRateCache,
  clearAllCaches,
  type CacheConfig,

  // Rate Limiter
  RateLimiter,
  SlidingWindowRateLimiter,
  RateLimitError,
  createRateLimiter,
  RATE_LIMIT_PRESETS,
  type RateLimiterConfig,

  // Logger
  Logger,
  HttpLogger,
  LogLevel,
  logger,
  setDebugMode,
  createLogger,
  type LoggerConfig,
  type LogEntry,
} from './utils';

// Webhook
export {
  WebhookRouter,
  createWebhookRouter,
  createWebhookHandler,
  verifyWebhookSignature,
  parseWebhookPayload,
  validateTimestamp,
  type WebhookEventType,
  type WebhookPayload,
  type WebhookHandler,
  type WebhookConfig,
} from './webhook';

// Batch Operations
export {
  BatchExecutor,
  BatchInvoiceSender,
  BatchDispatchSender,
  processBatch,
  parallelLimit,
  createBatchSender,
  type BatchResult,
  type BatchItemResult,
  type BatchConfig,
} from './batch';

// Testing / Mock
export {
  MockEtsClient,
  createMockClient,
  fixtures,
  assertions,
  generators,
  type MockConfig,
} from './testing';

// Invoice Diff
export {
  diffInvoices,
  diffLines,
  diffParties,
  formatDiff,
  formatDiffHtml,
  groupChanges,
  type DiffType,
  type DiffChange,
  type InvoiceDiffResult,
  type DiffOptions,
} from './diff';

// Health Check
export {
  EtsHealthCheck,
  createHealthCheck,
  createHealthCheckHandler,
  type HealthCheckResult,
  type HealthCheckEntry,
  type HealthCheckOptions,
} from './health';

// Telemetry
export {
  EtsTelemetry,
  InMemoryTelemetryCollector,
  createTelemetry,
  createMetricsHandler,
  getGlobalTelemetry,
  setGlobalTelemetry,
  type TelemetryCollector,
  type SpanInfo,
  type SpanEvent,
  type MetricInfo,
  type MetricType,
} from './telemetry';
