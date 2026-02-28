// Common types
export type {
  Integrator,
  EtsClientConfig,
  AuthCredentials,
  ApiResponse,
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
} from './common';

// Invoice types
export type {
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
} from './invoice';

export { InvoiceStatusCode } from './invoice';

// Archive types
export type {
  SendingType,
  ArchiveInfo,
  ArchiveInvoiceRequest,
  ArchiveInvoiceResult,
  ArchiveInvoiceStatus,
  ArchiveListQuery,
  ArchiveListItem,
  ArchiveCancelRequest,
} from './archive';

// Dispatch types
export type {
  DispatchTypeCode,
  DispatchProfileId,
  Dispatch,
  DispatchRequest,
  DispatchResult,
  DispatchStatus,
} from './dispatch';

// Producer receipt types
export type {
  ProducerReceiptProfileId,
  ProducerReceipt,
  ProducerReceiptRequest,
  ProducerReceiptResult,
  ProducerReceiptStatus,
} from './producer';

// Incoming invoice types
export type {
  IncomingInvoice,
  IncomingParty,
  IncomingInvoiceLine,
  IncomingInvoiceListQuery,
  IncomingInvoiceListResponse,
  InvoiceResponseRequest,
  InvoiceResponseResult,
  IncomingInvoiceStatus,
} from './incoming';

export { INCOMING_INVOICE_STATUS } from './incoming';

// Auto-routing types
export type {
  DocumentTypeRoute,
  AutoRouteResult,
  AutoRouteOptions,
  BulkStatusQuery,
  BulkStatusOptions,
  BulkStatusResult,
} from './auto-route';
