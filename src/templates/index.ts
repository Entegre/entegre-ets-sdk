import { InvoiceBuilder, type PartyInput, type LineInput } from '../builders';
import type { InvoiceRequest, ArchiveInvoiceRequest } from '../types';

/**
 * Şablon seçenekleri
 */
export interface TemplateOptions {
  /** Fatura tarihi (varsayılan: bugün) */
  date?: string;
  /** Para birimi (varsayılan: TRY) */
  currency?: string;
  /** Notlar */
  notes?: string[];
}

/**
 * Satış faturası şablonu
 */
export function salesInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: TemplateOptions = {}
): InvoiceRequest {
  const builder = InvoiceBuilder.create()
    .withType('SATIS')
    .withProfile('TEMELFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * İade faturası şablonu
 */
export function returnInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  originalInvoiceNumber: string,
  options: TemplateOptions = {}
): InvoiceRequest {
  const builder = InvoiceBuilder.create()
    .withType('IADE')
    .withProfile('TEMELFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines)
    .withNote(`İade edilen fatura no: ${originalInvoiceNumber}`);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * Tevkifatlı fatura seçenekleri
 */
export interface WithholdingTemplateOptions extends TemplateOptions {
  /** Tevkifat oranı (örn: 5/10 için 50) */
  withholdingRate: number;
  /** Tevkifat sebebi kodu */
  withholdingReasonCode?: string;
  /** Tevkifat sebebi */
  withholdingReason?: string;
}

/**
 * Tevkifatlı fatura şablonu
 */
export function withholdingInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: WithholdingTemplateOptions
): InvoiceRequest {
  // Tevkifat bilgisini notlara ekle
  const withholdingNote = `Tevkifat Oranı: ${options.withholdingRate / 10}/10${
    options.withholdingReason ? ` - ${options.withholdingReason}` : ''
  }`;

  const builder = InvoiceBuilder.create()
    .withType('TEVKIFAT')
    .withProfile('TEMELFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines)
    .withNote(withholdingNote);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * İstisna faturası seçenekleri
 */
export interface ExemptionTemplateOptions extends TemplateOptions {
  /** İstisna kodu */
  exemptionCode: string;
  /** İstisna sebebi */
  exemptionReason: string;
}

/**
 * İstisna faturası şablonu (KDV'siz)
 */
export function exemptionInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: ExemptionTemplateOptions
): InvoiceRequest {
  // Satırlara istisna bilgisi ekle
  const exemptLines = lines.map((line) => ({
    ...line,
    vatRate: 0,
    exemptionReasonCode: options.exemptionCode,
    exemptionReason: options.exemptionReason,
  }));

  const builder = InvoiceBuilder.create()
    .withType('ISTISNA')
    .withProfile('TEMELFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(exemptLines)
    .withNote(`İstisna: ${options.exemptionReason}`);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * İhracat faturası şablonu
 */
export function exportInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: TemplateOptions & { deliveryTerms?: string } = {}
): InvoiceRequest {
  // İhracatta KDV %0
  const exportLines = lines.map((line) => ({
    ...line,
    vatRate: 0,
    exemptionReasonCode: '701',
    exemptionReason: 'Mal İhracatı',
  }));

  const builder = InvoiceBuilder.create()
    .withType('SATIS')
    .withProfile('IHRACAT')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(exportLines);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);
  if (options.deliveryTerms) builder.withNote(`Teslim Şekli: ${options.deliveryTerms}`);

  return builder.build();
}

/**
 * E-Arşiv fatura şablonu (gerçek kişi için)
 */
export function eArchivePersonTemplate(
  supplier: PartyInput,
  customer: PartyInput & { email?: string; phone?: string },
  lines: LineInput[],
  options: TemplateOptions & {
    sendingType?: 'ELEKTRONIK' | 'KAGIT';
    isInternetSales?: boolean;
  } = {}
): ArchiveInvoiceRequest {
  const builder = InvoiceBuilder.create()
    .withType('SATIS')
    .withProfile('EARSIVFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.buildAsArchive(
    options.sendingType || 'ELEKTRONIK',
    options.isInternetSales || false
  );
}

/**
 * Ticari fatura şablonu (kabul/red mekanizmalı)
 */
export function commercialInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: TemplateOptions = {}
): InvoiceRequest {
  const builder = InvoiceBuilder.create()
    .withType('SATIS')
    .withProfile('TICARIFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * Özel matrah faturası şablonu
 */
export function specialBaseInvoiceTemplate(
  supplier: PartyInput,
  customer: PartyInput,
  lines: LineInput[],
  options: TemplateOptions = {}
): InvoiceRequest {
  const builder = InvoiceBuilder.create()
    .withType('OZELMATRAH')
    .withProfile('TEMELFATURA')
    .withSupplier(supplier)
    .withCustomer(customer)
    .addLines(lines);

  if (options.date) builder.withDate(options.date);
  if (options.currency) builder.withCurrency(options.currency);
  if (options.notes) builder.withNotes(options.notes);

  return builder.build();
}

/**
 * Yaygın istisna kodları
 */
export const EXEMPTION_CODES = {
  /** Mal ihracatı */
  MAL_IHRACATI: { code: '701', reason: 'Mal İhracatı' },
  /** Hizmet ihracatı */
  HIZMET_IHRACATI: { code: '702', reason: 'Hizmet İhracatı' },
  /** Serbest bölge */
  SERBEST_BOLGE: { code: '703', reason: 'Serbest Bölgelerde Yapılan İşlemler' },
  /** Diplomatik istisna */
  DIPLOMATIK: { code: '704', reason: 'Diplomatik İstisna' },
  /** Transit taşımacılık */
  TRANSIT: { code: '705', reason: 'Transit Taşımacılık' },
  /** Yatırım teşvik */
  YATIRIM_TESVIK: { code: '706', reason: 'Yatırım Teşvik Belgesi Kapsamında' },
} as const;

/**
 * Yaygın tevkifat kodları
 */
export const WITHHOLDING_CODES = {
  /** Yapım işleri (4/10) */
  YAPIM_ISLERI: { code: '601', reason: 'Yapım İşleri', rate: 40 },
  /** Temizlik hizmetleri (9/10) */
  TEMIZLIK: { code: '602', reason: 'Temizlik Hizmetleri', rate: 90 },
  /** Güvenlik hizmetleri (9/10) */
  GUVENLIK: { code: '603', reason: 'Güvenlik Hizmetleri', rate: 90 },
  /** Personel hizmetleri (9/10) */
  PERSONEL: { code: '604', reason: 'Personel Temin Hizmetleri', rate: 90 },
  /** Yemek servisi (5/10) */
  YEMEK: { code: '605', reason: 'Yemek Servis Hizmeti', rate: 50 },
  /** Makine ve teçhizat kiralama (5/10) */
  MAKINE_KIRALAMA: { code: '606', reason: 'Makine ve Teçhizat Kiralaması', rate: 50 },
  /** İşgücü temin (9/10) */
  ISGUCU: { code: '607', reason: 'İşgücü Temin Hizmetleri', rate: 90 },
} as const;
