import type { Invoice, InvoiceResult, InvoiceStatus, InvoiceListQuery, InvoiceListItem } from './invoice';
import type { TargetCustomer } from './common';

/**
 * Gönderim tipi
 */
export type SendingType = 'ELEKTRONIK' | 'KAGIT';

/**
 * E-Arşiv bilgileri
 */
export interface ArchiveInfo {
  /** Gönderim tipi */
  SendingType: SendingType;
  /** İnternet satışı mı? */
  IsInternetSales?: boolean;
}

/**
 * E-Arşiv fatura isteği
 */
export interface ArchiveInvoiceRequest {
  /** ETS Token (otomatik eklenir) */
  EtsToken?: string;
  /** Fatura bilgileri */
  Invoice: Invoice;
  /** Hedef müşteri bilgileri */
  TargetCustomer?: TargetCustomer;
  /** E-Arşiv bilgileri */
  ArchiveInfo?: ArchiveInfo;
}

/**
 * E-Arşiv fatura sonucu
 */
export type ArchiveInvoiceResult = InvoiceResult;

/**
 * E-Arşiv fatura durumu
 */
export type ArchiveInvoiceStatus = InvoiceStatus;

/**
 * E-Arşiv listeleme sorgusu
 */
export type ArchiveListQuery = InvoiceListQuery;

/**
 * E-Arşiv liste öğesi
 */
export type ArchiveListItem = InvoiceListItem;

/**
 * E-Arşiv iptal isteği
 */
export interface ArchiveCancelRequest {
  /** İptal tarihi (YYYY-MM-DD) */
  cancelDate?: string;
}
