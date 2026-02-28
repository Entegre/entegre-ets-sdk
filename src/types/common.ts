/**
 * Entegratör kodları
 */
export type Integrator = 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS';

/**
 * API istek ayarları
 */
export interface EtsClientConfig {
  /** API base URL (varsayılan: https://ets.bulutix.com) */
  baseUrl?: string;
  /** Entegratör kodu */
  integrator?: Integrator;
  /** Yazılım ID'si */
  softwareId?: string;
  /** İstek timeout süresi (ms) */
  timeout?: number;
}

/**
 * Kimlik doğrulama bilgileri
 */
export interface AuthCredentials {
  /** Vergi Kimlik Numarası veya TC Kimlik Numarası */
  partyId: string;
  /** Kullanıcı adı */
  username: string;
  /** Şifre */
  password: string;
}

/**
 * API yanıt formatı
 */
export interface ApiResponse<T> {
  /** İşlem başarılı mı? */
  success: boolean;
  /** Yanıt mesajı */
  message?: string | null;
  /** Yanıt verisi */
  data?: T | null;
}

/**
 * Adres bilgileri
 */
export interface Address {
  /** Ülke */
  Country?: string;
  /** Şehir */
  CityName?: string;
  /** İlçe */
  CitySubdivisionName?: string;
  /** Semt/Mahalle */
  DistrictName?: string;
  /** Sokak/Cadde */
  StreetName?: string;
  /** Bina numarası */
  BuildingNumber?: string;
  /** Posta kodu */
  PostalZone?: string;
}

/**
 * Kişi bilgileri (gerçek kişi alıcı için)
 */
export interface Person {
  /** Ad */
  FirstName: string;
  /** Soyad */
  FamilyName: string;
}

/**
 * Taraf bilgileri (gönderici/alıcı)
 */
export interface Party {
  /** VKN veya TCKN */
  PartyIdentification: string;
  /** Firma/kişi adı */
  PartyName: string;
  /** Vergi dairesi */
  PartyTaxScheme?: string;
  /** Posta kutusu alias'ı */
  Alias?: string;
  /** Adres bilgileri */
  Address?: Address;
  /** Kişi bilgileri (gerçek kişi için) */
  Person?: Person;
}

/**
 * Hedef müşteri bilgileri
 */
export interface TargetCustomer {
  /** Müşteri adı */
  PartyName: string;
  /** VKN veya TCKN */
  PartyIdentification: string;
  /** Posta kutusu alias'ı */
  Alias?: string;
}

/**
 * Vergi bilgisi
 */
export interface Tax {
  /** Vergi kodu (örn: 0015 = KDV) */
  TaxCode: string;
  /** Vergi adı */
  TaxName: string;
  /** Vergi oranı (%) */
  Percent: number;
  /** Vergi tutarı */
  TaxAmount: number;
  /** Muafiyet sebebi */
  ExemptionReason?: string;
  /** Muafiyet kodu */
  ExemptionReasonCode?: string;
}

/**
 * Belge satırı
 */
export interface DocumentLine {
  /** Ürün kodu */
  ItemCode: string;
  /** Ürün adı */
  ItemName: string;
  /** Açıklama */
  Description?: string;
  /** Miktar */
  InvoicedQuantity: number;
  /** Birim kodu (C62=Adet, KGM=Kg, LTR=Lt, vb.) */
  IsoUnitCode: string;
  /** Para birimi */
  CurrencyId?: string;
  /** Birim fiyat */
  Price: number;
  /** Satır toplam tutarı (KDV hariç) */
  LineExtensionAmount?: number;
  /** Vergiler */
  Taxes?: Tax[];
}

/**
 * Toplam tutar bilgileri
 */
export interface LegalMonetaryTotal {
  /** Satır toplamı (KDV hariç) */
  LineExtensionAmount: number;
  /** Vergiler hariç toplam */
  TaxExclusiveAmount?: number;
  /** Vergiler dahil toplam */
  TaxIncludedAmount?: number;
  /** İndirim toplamı */
  AllowanceTotalAmount?: number;
  /** Ödenecek toplam */
  PayableAmount: number;
}

/**
 * Kullanıcı kontrol sonucu
 */
export interface UserCheckResult {
  /** VKN/TCKN */
  partyId: string;
  /** E-belge mükellefi mi? */
  isActive: boolean;
}

/**
 * Kullanıcı alias bilgisi
 */
export interface UserAlias {
  /** Alias (örn: urn:mail:defaultpk@firma.com.tr) */
  alias: string;
  /** Oluşturulma tarihi */
  creationTime?: string;
}

/**
 * Kullanıcı alias listesi sonucu
 */
export interface UserAliasResult {
  /** VKN/TCKN */
  partyIdentificationId: string;
  /** Firma unvanı */
  title?: string;
  /** Mükellef tipi */
  type?: string;
  /** Kayıt tarihi */
  registerTime?: string;
  /** Gönderici kutusu alias'ları */
  senderboxAliases: UserAlias[];
  /** Alıcı kutusu alias'ları */
  receiverboxAliases: UserAlias[];
}

/**
 * Döviz kuru bilgisi
 */
export interface ExchangeRate {
  /** Para birimi kodu */
  currency: string;
  /** Alış kuru */
  buyingRate?: number;
  /** Satış kuru */
  sellingRate?: number;
  /** Efektif kur */
  effectiveRate?: number;
  /** Tarih */
  date?: string;
}

/**
 * PDF sonucu
 */
export interface PdfResult {
  /** Base64 encoded PDF içeriği */
  pdfContent?: string;
  /** Dosya adı */
  fileName?: string;
}
