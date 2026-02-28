/**
 * Gelen fatura modeli
 */
export interface IncomingInvoice {
  /** Fatura UUID */
  uuid: string;
  /** Fatura numarası */
  invoiceNumber: string;
  /** Fatura tarihi */
  invoiceDate: string;
  /** Fatura tipi */
  invoiceType: string;
  /** Belge tipi */
  documentType: string;
  /** Gönderici bilgileri */
  sender: IncomingParty;
  /** Para birimi */
  currency: string;
  /** Ara toplam (KDV hariç) */
  subtotal: number;
  /** Toplam KDV */
  totalVat: number;
  /** Ödenecek tutar */
  payableAmount: number;
  /** Durum */
  status: string;
  /** Durum tarihi */
  statusDate?: string;
  /** Yanıt son tarihi */
  responseDeadline?: string;
  /** Fatura satırları */
  lines: IncomingInvoiceLine[];
  /** Notlar */
  notes: string[];
  /** XML içeriği (Base64) */
  xmlContent?: string;
  /** PDF içeriği (Base64) */
  pdfContent?: string;
  /** Alınma tarihi */
  receivedDate: string;
}

/**
 * Gelen fatura taraf bilgileri
 */
export interface IncomingParty {
  /** VKN veya TCKN */
  taxId: string;
  /** Ad/Unvan */
  name: string;
  /** Vergi dairesi */
  taxOffice?: string;
  /** Adres */
  address?: string;
  /** Şehir */
  city?: string;
  /** İlçe */
  district?: string;
  /** E-posta */
  email?: string;
  /** Telefon */
  phone?: string;
}

/**
 * Gelen fatura satırı
 */
export interface IncomingInvoiceLine {
  /** Satır numarası */
  lineNumber: number;
  /** Ürün/hizmet adı */
  name: string;
  /** Açıklama */
  description?: string;
  /** Miktar */
  quantity: number;
  /** Birim kodu */
  unitCode: string;
  /** Birim fiyat */
  unitPrice: number;
  /** KDV oranı */
  vatRate: number;
  /** KDV tutarı */
  vatAmount: number;
  /** Satır toplamı */
  lineTotal: number;
  /** İndirim tutarı */
  discountAmount?: number;
}

/**
 * Gelen fatura listeleme sorgusu
 */
export interface IncomingInvoiceListQuery {
  /** Başlangıç tarihi */
  startDate?: string;
  /** Bitiş tarihi */
  endDate?: string;
  /** Gönderen VKN */
  senderTaxId?: string;
  /** Durum filtresi */
  status?: IncomingInvoiceStatus;
  /** Sayfa numarası */
  page?: number;
  /** Sayfa boyutu */
  pageSize?: number;
}

/**
 * Gelen fatura liste yanıtı
 */
export interface IncomingInvoiceListResponse {
  /** Fatura listesi */
  invoices: IncomingInvoice[];
  /** Toplam sayı */
  totalCount: number;
  /** Sayfa numarası */
  page: number;
  /** Sayfa boyutu */
  pageSize: number;
  /** Toplam sayfa */
  totalPages: number;
}

/**
 * Fatura yanıt isteği
 */
export interface InvoiceResponseRequest {
  /** Yanıt tipi */
  responseType: 'KABUL' | 'RED';
  /** Red sebebi (RED için zorunlu) */
  reason?: string;
  /** Not */
  note?: string;
}

/**
 * Fatura yanıt sonucu
 */
export interface InvoiceResponseResult {
  /** Fatura UUID */
  uuid: string;
  /** Yanıt tipi */
  responseType: string;
  /** Yanıt tarihi */
  responseDate: string;
  /** Zarf UUID */
  envelopeUuid?: string;
}

/**
 * Gelen fatura durum sabitleri
 */
export type IncomingInvoiceStatus = 'WAITING' | 'ACCEPTED' | 'REJECTED' | 'AUTO_ACCEPTED';

/**
 * Gelen fatura durum sabitleri
 */
export const INCOMING_INVOICE_STATUS = {
  /** Yanıt bekliyor */
  WAITING: 'WAITING' as const,
  /** Kabul edildi */
  ACCEPTED: 'ACCEPTED' as const,
  /** Reddedildi */
  REJECTED: 'REJECTED' as const,
  /** Otomatik kabul edildi */
  AUTO_ACCEPTED: 'AUTO_ACCEPTED' as const,
};
