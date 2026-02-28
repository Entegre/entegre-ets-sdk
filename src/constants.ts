/**
 * Varsayılan API URL'leri
 */
export const API_URLS = {
  /** Canlı ortam */
  PRODUCTION: 'https://ets.bulutix.com',
  /** Test ortamı */
  TEST: 'https://ets-test.bulutix.com',
} as const;

/**
 * Birim kodları (UN/ECE Recommendation 20)
 */
export const UNIT_CODES = {
  /** Adet (birim) */
  ADET: 'C62',
  /** Kilogram */
  KILOGRAM: 'KGM',
  /** Gram */
  GRAM: 'GRM',
  /** Litre */
  LITRE: 'LTR',
  /** Metre */
  METRE: 'MTR',
  /** Metrekare */
  METREKARE: 'MTK',
  /** Metreküp */
  METREKUP: 'MTQ',
  /** Ton */
  TON: 'TNE',
  /** Gün */
  GUN: 'DAY',
  /** Saat */
  SAAT: 'HUR',
  /** Ay */
  AY: 'MON',
  /** Yıl */
  YIL: 'ANN',
  /** Kilowatt saat */
  KWH: 'KWH',
  /** Çift */
  CIFT: 'PR',
  /** Set */
  SET: 'SET',
  /** Kutu */
  KUTU: 'BX',
  /** Karton */
  KARTON: 'CT',
} as const;

/**
 * Vergi kodları
 */
export const TAX_CODES = {
  /** Katma Değer Vergisi */
  KDV: '0015',
  /** Özel Tüketim Vergisi (I) */
  OTV_I: '0003',
  /** Özel Tüketim Vergisi (II) */
  OTV_II: '0071',
  /** Özel Tüketim Vergisi (III) */
  OTV_III: '0073',
  /** Özel Tüketim Vergisi (IV) */
  OTV_IV: '0074',
  /** Konaklama Vergisi */
  KONAKLAMA: '0059',
  /** Tevkifatlı KDV */
  KDV_TEVKIFAT: '9015',
  /** Stopaj (Gelir Vergisi Kesintisi) */
  STOPAJ: '0003',
} as const;

/**
 * Fatura tipleri
 */
export const INVOICE_TYPES = {
  /** Satış faturası */
  SATIS: 'SATIS',
  /** İade faturası */
  IADE: 'IADE',
  /** Tevkifatlı fatura */
  TEVKIFAT: 'TEVKIFAT',
  /** İstisna faturası */
  ISTISNA: 'ISTISNA',
  /** Özel matrah faturası */
  OZEL_MATRAH: 'OZELMATRAH',
  /** İhraç kayıtlı fatura */
  IHRAC_KAYITLI: 'IHRACKAYITLI',
} as const;

/**
 * Fatura profilleri
 */
export const INVOICE_PROFILES = {
  /** Temel fatura */
  TEMEL: 'TEMELFATURA',
  /** Ticari fatura */
  TICARI: 'TICARIFATURA',
  /** İhracat faturası */
  IHRACAT: 'IHRACAT',
  /** Yolcu beraberi fatura */
  YOLCU_BERABERI: 'YOLCUBERABERI',
  /** E-Arşiv fatura */
  E_ARSIV: 'EARSIVFATURA',
} as const;

/**
 * İrsaliye profilleri
 */
export const DISPATCH_PROFILES = {
  /** Temel irsaliye */
  TEMEL: 'TEMELIRSALIYE',
} as const;

/**
 * Müstahsil makbuzu profilleri
 */
export const PRODUCER_RECEIPT_PROFILES = {
  /** Temel müstahsil makbuzu */
  TEMEL: 'TEMELMUSTAHSILMAKBUZ',
} as const;

/**
 * Para birimleri
 */
export const CURRENCIES = {
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
} as const;

/**
 * Entegratör kodları
 */
export const INTEGRATORS = {
  /** Uyumsoft */
  UYUMSOFT: 'UYM',
  /** Uyumsoft Kurumsal */
  UYUMSOFT_KURUMSAL: 'UYK',
  /** İzibiz */
  IZIBIZ: 'IZI',
  /** Doğan E-Dönüşüm */
  DOGAN: 'DGN',
  /** Mysoft */
  MYSOFT: 'MYS',
} as const;
