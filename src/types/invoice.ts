import type { Party, DocumentLine, LegalMonetaryTotal, Tax, TargetCustomer } from './common';

/**
 * Fatura tipi
 */
export type InvoiceTypeCode =
  | 'SATIS'
  | 'IADE'
  | 'TEVKIFAT'
  | 'ISTISNA'
  | 'OZELMATRAH'
  | 'IHRACKAYITLI';

/**
 * Fatura profili
 */
export type InvoiceProfileId =
  | 'TEMELFATURA'
  | 'TICARIFATURA'
  | 'IHRACAT'
  | 'YOLCUBERABERI'
  | 'EARSIVFATURA';

/**
 * Fatura modeli
 */
export interface Invoice {
  /** Taslak mı? */
  IsDraft?: boolean;
  /** Fatura numarası */
  InvoiceId?: string;
  /** Fatura tipi */
  InvoiceTypeCode: InvoiceTypeCode | string;
  /** Fatura profili */
  ProfileId: InvoiceProfileId | string;
  /** Düzenleme tarihi (YYYY-MM-DD) */
  IssueDate: string;
  /** Para birimi (varsayılan: TRY) */
  DocumentCurrencyCode?: string;
  /** Para birimi ID */
  CurrencyId?: string;
  /** Döviz kuru (yabancı para birimleri için) */
  ExchangeRate?: number;
  /** Fatura notları */
  Notes?: string[];
  /** Gönderici bilgileri */
  SupplierParty: Party;
  /** Alıcı bilgileri */
  CustomerParty: Party;
  /** Fatura kalemleri */
  DocumentLines: DocumentLine[];
  /** Toplam tutar bilgileri */
  LegalMonetaryTotal: LegalMonetaryTotal;
  /** Vergi toplamları */
  TaxTotals?: Tax[];
}

/**
 * Fatura gönderim isteği
 */
export interface InvoiceRequest {
  /** ETS Token (otomatik eklenir) */
  EtsToken?: string;
  /** Fatura bilgileri */
  Invoice: Invoice;
  /** Hedef müşteri bilgileri */
  TargetCustomer?: TargetCustomer;
}

/**
 * Fatura gönderim sonucu
 */
export interface InvoiceResult {
  /** Fatura UUID'si */
  uuid?: string;
  /** Fatura numarası */
  invoiceNumber?: string;
  /** Sonuç mesajı */
  message?: string;
  /** İşlem kodu */
  code?: string;
}

/**
 * Fatura durumu
 */
export interface InvoiceStatus {
  /** Fatura UUID'si */
  uuid?: string;
  /** Fatura numarası */
  invoiceNumber?: string;
  /** Durum */
  status?: string;
  /** Durum açıklaması */
  statusDescription?: string;
}

/**
 * Fatura durum kodları
 */
export enum InvoiceStatusCode {
  /** Hazırlanmadı */
  NotPrepared = 0,
  /** Gönderilmedi */
  NotSent = 1,
  /** Taslak */
  Draft = 2,
  /** İptal edildi */
  Cancelled = 3,
  /** Kuyrukta */
  Queued = 4,
  /** İşleniyor */
  Processing = 5,
  /** GİB'e gönderildi */
  SentToGib = 6,
  /** Onaylandı */
  Approved = 7,
  /** Onay bekliyor */
  WaitingForApprovement = 8,
  /** Reddedildi */
  Declined = 9,
  /** İade edildi */
  Return = 10,
  /** E-Arşiv iptal */
  EArchiveCancelled = 11,
  /** Hata */
  Error = 12,
  /** Beklemede */
  Pending = 13,
}

/**
 * Fatura listeleme sorgusu
 */
export interface InvoiceListQuery {
  /** Başlangıç tarihi (YYYY-MM-DD) */
  startDate: string;
  /** Bitiş tarihi (YYYY-MM-DD) */
  endDate: string;
  /** Sayfa numarası (0'dan başlar) */
  pageIndex?: number;
  /** Sayfa boyutu */
  pageSize?: number;
}

/**
 * Fatura liste öğesi
 */
export interface InvoiceListItem {
  /** Fatura UUID'si */
  uuid?: string;
  /** Fatura numarası */
  invoiceNumber?: string;
  /** Düzenleme tarihi */
  issueDate?: string;
  /** Müşteri adı */
  customerName?: string;
  /** Müşteri VKN/TCKN */
  customerTaxId?: string;
  /** Ödenecek tutar */
  payableAmount?: number;
  /** Para birimi */
  currencyCode?: string;
  /** Durum */
  status?: string;
}

/**
 * Fatura yanıt tipi
 */
export type ResponseType = 'KABUL' | 'RED';

/**
 * Fatura yanıt isteği
 */
export interface RespondRequest {
  /** Yanıt tipi */
  responseType: ResponseType;
  /** Açıklama */
  description?: string;
}
