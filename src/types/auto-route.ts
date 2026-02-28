/**
 * Otomatik Yönlendirme (Auto-routing) Tipleri
 *
 * E-fatura / E-arşiv otomatik seçimi için tipler.
 */

import type { InvoiceResult, InvoiceStatus } from './invoice';

/**
 * Belge tipi
 */
export type DocumentTypeRoute = 'EFATURA' | 'EARSIV';

/**
 * Otomatik yönlendirme sonucu
 */
export interface AutoRouteResult {
  /** Fatura UUID'si */
  uuid: string;
  /** Fatura numarası */
  invoiceNumber?: string;
  /** Kullanılan belge tipi */
  documentType: DocumentTypeRoute;
  /** Alıcı e-fatura mükellefi mi? */
  isEInvoiceRecipient: boolean;
  /** Fatura gönderim sonucu */
  result: InvoiceResult;
}

/**
 * Otomatik yönlendirme seçenekleri
 */
export interface AutoRouteOptions {
  /** Cache'i atla ve mükellefiyet durumunu yeniden sorgula */
  skipCache?: boolean;
  /** Belge tipini zorla (otomatik yönlendirmeyi devre dışı bırakır) */
  forceType?: DocumentTypeRoute;
  /** E-Arşiv gönderim tipi (varsayılan: ELEKTRONIK) */
  archiveSendingType?: 'ELEKTRONIK' | 'KAGIT';
  /** E-Arşiv internet satışı mı? */
  isInternetSales?: boolean;
}

/**
 * Toplu durum sorgu isteği
 */
export interface BulkStatusQuery {
  /** Sorgulanacak UUID listesi */
  uuids: string[];
  /** E-Arşiv'de de ara (varsayılan: true) */
  includeEArchive?: boolean;
}

/**
 * Toplu durum sorgu seçenekleri
 */
export interface BulkStatusOptions {
  /** Paralel sorgu sayısı (varsayılan: 5) */
  concurrency?: number;
  /** Hata durumunda devam et (varsayılan: true) */
  continueOnError?: boolean;
  /** Retry sayısı (varsayılan: 1) */
  retries?: number;
}

/**
 * Tek bir belgenin durum sonucu
 */
export interface BulkStatusResult {
  /** Belge UUID'si */
  uuid: string;
  /** Belge tipi (bulunduğu konum) */
  documentType?: DocumentTypeRoute;
  /** Durum bilgisi */
  status?: InvoiceStatus;
  /** Başarılı mı? */
  success: boolean;
  /** Hata mesajı */
  error?: string;
}
