import type { Party, DocumentLine, TargetCustomer } from './common';
import type { InvoiceResult, InvoiceStatus } from './invoice';

/**
 * İrsaliye tipi
 */
export type DispatchTypeCode = 'SEVK' | 'MATBUDAN';

/**
 * İrsaliye profili
 */
export type DispatchProfileId = 'TEMELIRSALIYE';

/**
 * İrsaliye modeli
 */
export interface Dispatch {
  /** İrsaliye numarası */
  DispatchId?: string;
  /** Profil ID */
  ProfileId: DispatchProfileId | string;
  /** Düzenleme tarihi (YYYY-MM-DD) */
  IssueDate: string;
  /** İrsaliye tipi */
  DispatchTypeCode: DispatchTypeCode | string;
  /** Para birimi */
  CurrencyId?: string;
  /** Notlar */
  Notes?: string[];
  /** Gönderici bilgileri */
  SupplierParty: Party;
  /** Alıcı bilgileri */
  CustomerParty: Party;
  /** İrsaliye kalemleri */
  DocumentLines: DocumentLine[];
}

/**
 * İrsaliye gönderim isteği
 */
export interface DispatchRequest {
  /** ETS Token (otomatik eklenir) */
  EtsToken?: string;
  /** İrsaliye bilgileri */
  Dispatch: Dispatch;
  /** Hedef müşteri bilgileri */
  TargetCustomer?: TargetCustomer;
}

/**
 * İrsaliye gönderim sonucu
 */
export type DispatchResult = InvoiceResult;

/**
 * İrsaliye durumu
 */
export type DispatchStatus = InvoiceStatus;
