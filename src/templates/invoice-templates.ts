import { InvoiceBuilder } from '../builders/invoice-builder';
import { INVOICE_TYPES, INVOICE_PROFILES, CURRENCIES } from '../constants';

/**
 * Hazır fatura şablonları - Builder döndürür, özelleştirme yapılabilir
 *
 * @example
 * ```typescript
 * // Perakende satış faturası
 * const invoice = InvoiceTemplates.retail()
 *   .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
 *   .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
 *   .addLine({ itemCode: 'URUN-001', itemName: 'Ürün', quantity: 1, price: 100 })
 *   .build();
 *
 * // İhracat faturası
 * const exportInvoice = InvoiceTemplates.exportUsd()
 *   .withSupplier(supplier)
 *   .withCustomer(foreignCustomer)
 *   .addLine({ itemCode: 'EXP-001', itemName: 'Export Product', quantity: 10, price: 50 })
 *   .build();
 * ```
 */
export const InvoiceTemplates = {
  /**
   * Perakende satış faturası (E-Arşiv)
   */
  retail: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.E_ARSIV)
      .withCurrency(CURRENCIES.TRY),

  /**
   * B2B e-fatura (Ticari profil)
   */
  b2b: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY),

  /**
   * Temel fatura (Kabul/red mekanizması yok)
   */
  basic: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.TEMEL)
      .withCurrency(CURRENCIES.TRY),

  /**
   * Hizmet faturası
   */
  service: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY),

  /**
   * İhracat faturası (USD)
   */
  exportUsd: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.ISTISNA)
      .withProfile(INVOICE_PROFILES.IHRACAT)
      .withCurrency(CURRENCIES.USD)
      .withNote('Mal İhracatı - KDV İstisnası'),

  /**
   * İhracat faturası (EUR)
   */
  exportEur: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.ISTISNA)
      .withProfile(INVOICE_PROFILES.IHRACAT)
      .withCurrency(CURRENCIES.EUR)
      .withNote('Mal İhracatı - KDV İstisnası'),

  /**
   * İade faturası
   */
  return: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.IADE)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY),

  /**
   * Tevkifatlı fatura - Güvenlik hizmetleri (9/10)
   */
  withholdingSecurity: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.TEVKIFAT)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withWithholding(90, '603', 'Güvenlik Hizmetleri'),

  /**
   * Tevkifatlı fatura - Temizlik hizmetleri (9/10)
   */
  withholdingCleaning: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.TEVKIFAT)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withWithholding(90, '602', 'Temizlik Hizmetleri'),

  /**
   * Tevkifatlı fatura - Personel hizmetleri (9/10)
   */
  withholdingPersonnel: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.TEVKIFAT)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withWithholding(90, '604', 'İşgücü Temin Hizmetleri'),

  /**
   * Tevkifatlı fatura - Yapım işleri (4/10)
   */
  withholdingConstruction: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.TEVKIFAT)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withWithholding(40, '601', 'Yapım İşleri'),

  /**
   * Tevkifatlı fatura - Yemek hizmetleri (5/10)
   */
  withholdingCatering: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.TEVKIFAT)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withWithholding(50, '605', 'Yemek Servis Hizmetleri'),

  /**
   * SGK faturası
   */
  sgk: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.TICARI)
      .withCurrency(CURRENCIES.TRY)
      .withNote('SGK Faturası'),

  /**
   * Proforma fatura (taslak)
   */
  proforma: () =>
    InvoiceBuilder.create()
      .withType(INVOICE_TYPES.SATIS)
      .withProfile(INVOICE_PROFILES.E_ARSIV)
      .withCurrency(CURRENCIES.TRY)
      .withNote('PROFORMA - Kesin fatura değildir')
      .asDraft(),
};

/**
 * Tevkifat kodları ve oranları
 */
export const WithholdingCodes = {
  /** Yapım işleri (4/10) */
  CONSTRUCTION: { rate: 40, code: '601', reason: 'Yapım İşleri' },
  /** Temizlik hizmetleri (9/10) */
  CLEANING: { rate: 90, code: '602', reason: 'Temizlik Hizmetleri' },
  /** Güvenlik hizmetleri (9/10) */
  SECURITY: { rate: 90, code: '603', reason: 'Güvenlik Hizmetleri' },
  /** Personel hizmetleri (9/10) */
  PERSONNEL: { rate: 90, code: '604', reason: 'İşgücü Temin Hizmetleri' },
  /** Yemek hizmetleri (5/10) */
  CATERING: { rate: 50, code: '605', reason: 'Yemek Servis Hizmetleri' },
  /** Makine/ekipman kiralama (5/10) */
  EQUIPMENT_RENTAL: { rate: 50, code: '606', reason: 'Makine/Ekipman Kiralama' },
  /** Kargo/nakliye (2/10) */
  TRANSPORT: { rate: 20, code: '607', reason: 'Kargo/Nakliye Hizmetleri' },
  /** Reklam hizmetleri (3/10) */
  ADVERTISING: { rate: 30, code: '608', reason: 'Reklam Hizmetleri' },
  /** Turizm hizmetleri (2/10) */
  TOURISM: { rate: 20, code: '609', reason: 'Turizm Hizmetleri' },
} as const;

/**
 * İstisna kodları
 */
export const ExemptionCodes = {
  /** Mal ihracatı */
  GOODS_EXPORT: { code: '301', reason: 'Mal İhracatı' },
  /** Hizmet ihracatı */
  SERVICE_EXPORT: { code: '302', reason: 'Hizmet İhracatı' },
  /** Transit ticaret */
  TRANSIT_TRADE: { code: '303', reason: 'Transit Ticaret' },
  /** Serbest bölge teslimi */
  FREE_ZONE: { code: '304', reason: 'Serbest Bölge Teslimi' },
  /** Diplomatik istisna */
  DIPLOMATIC: { code: '305', reason: 'Diplomatik İstisna' },
  /** Uluslararası kuruluş */
  INTERNATIONAL_ORG: { code: '306', reason: 'Uluslararası Kuruluş İstisnası' },
  /** Yatırım teşvik */
  INVESTMENT_INCENTIVE: { code: '350', reason: 'Yatırım Teşvik Belgesi' },
} as const;
