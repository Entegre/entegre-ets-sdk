import type { Party, DocumentLine, LegalMonetaryTotal } from './common';
import type { InvoiceResult, InvoiceStatus } from './invoice';

/**
 * Müstahsil makbuzu profili
 */
export type ProducerReceiptProfileId = 'TEMELMUSTAHSILMAKBUZ';

/**
 * Müstahsil makbuzu modeli
 */
export interface ProducerReceipt {
  /** Makbuz numarası */
  ReceiptId?: string;
  /** Profil ID */
  ProfileId: ProducerReceiptProfileId | string;
  /** Düzenleme tarihi (YYYY-MM-DD) */
  IssueDate: string;
  /** Para birimi */
  CurrencyId?: string;
  /** Notlar */
  Notes?: string[];
  /** Gönderici bilgileri */
  SupplierParty: Party;
  /** Alıcı bilgileri */
  CustomerParty: Party;
  /** Makbuz kalemleri */
  DocumentLines: DocumentLine[];
  /** Toplam tutar bilgileri */
  LegalMonetaryTotal: LegalMonetaryTotal;
}

/**
 * Müstahsil makbuzu gönderim isteği
 */
export interface ProducerReceiptRequest {
  /** ETS Token (otomatik eklenir) */
  EtsToken?: string;
  /** Makbuz bilgileri */
  ProducerReceipt: ProducerReceipt;
}

/**
 * Müstahsil makbuzu sonucu
 */
export type ProducerReceiptResult = InvoiceResult;

/**
 * Müstahsil makbuzu durumu
 */
export type ProducerReceiptStatus = InvoiceStatus;
