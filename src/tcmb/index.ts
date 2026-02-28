/**
 * TCMB (Türkiye Cumhuriyet Merkez Bankası) Döviz Kuru Servisi
 *
 * TCMB'nin günlük ve tarihsel döviz kurlarını çeken servis.
 *
 * @example
 * ```typescript
 * import { tcmb } from '@entegre/ets-sdk';
 *
 * // Bugünün kurları
 * const rates = await tcmb.getTodayRates();
 * console.log(rates.rates.get('USD'));
 *
 * // Belirli bir tarih
 * const historicRates = await tcmb.getRatesForDate(new Date('2024-01-15'));
 *
 * // Tek bir kur
 * const usdRate = await tcmb.getRate('USD');
 * console.log(usdRate?.forexSelling);
 *
 * // Fatura için kur (ForexSelling / Unit)
 * const invoiceRate = await tcmb.getInvoiceRate('USD');
 * console.log(`1 USD = ${invoiceRate} TRY`);
 * ```
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

/**
 * Tek bir döviz kuru bilgisi
 */
export interface TcmbRate {
  /** Para birimi kodu (USD, EUR, vb.) */
  currencyCode: string;
  /** Para birimi adı (Türkçe) */
  currencyName: string;
  /** Birim (1, 100, vb.) */
  unit: number;
  /** Döviz alış kuru */
  forexBuying: number;
  /** Döviz satış kuru */
  forexSelling: number;
  /** Efektif alış kuru */
  banknoteBuying: number;
  /** Efektif satış kuru */
  banknoteSelling: number;
  /** Çapraz kur */
  crossRate?: number;
}

/**
 * TCMB kur çekme sonucu
 */
export interface TcmbRatesResult {
  /** Kur tarihi */
  date: Date;
  /** Kaynak (TCMB XML dosya adı) */
  source: string;
  /** Tüm kurlar (para birimi kodu -> kur bilgisi) */
  rates: Map<string, TcmbRate>;
}

/**
 * TCMB servis konfigürasyonu
 */
export interface TcmbServiceConfig {
  /** Cache süresi (ms) - varsayılan: 1 saat */
  cacheTtl?: number;
  /** Timeout (ms) - varsayılan: 10 saniye */
  timeout?: number;
}

interface CacheEntry {
  data: TcmbRatesResult;
  timestamp: number;
}

/**
 * TCMB Döviz Kuru Servisi
 */
export class TcmbService {
  private readonly TCMB_BASE_URL = 'https://www.tcmb.gov.tr/kurlar';
  private readonly parser: XMLParser;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTtl: number;
  private readonly timeout: number;

  constructor(config: TcmbServiceConfig = {}) {
    this.cacheTtl = config.cacheTtl ?? 60 * 60 * 1000; // 1 saat
    this.timeout = config.timeout ?? 10000; // 10 saniye

    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Bugünün kurlarını getirir
   *
   * @example
   * ```typescript
   * const result = await tcmb.getTodayRates();
   * const usd = result.rates.get('USD');
   * console.log(`USD alış: ${usd?.forexBuying}, satış: ${usd?.forexSelling}`);
   * ```
   */
  async getTodayRates(): Promise<TcmbRatesResult> {
    const url = `${this.TCMB_BASE_URL}/today.xml`;
    return this.fetchAndParseRates(url, 'today');
  }

  /**
   * Belirli bir tarihin kurlarını getirir
   *
   * @param date - Tarih
   *
   * @example
   * ```typescript
   * const rates = await tcmb.getRatesForDate(new Date('2024-01-15'));
   * console.log('EUR kuru:', rates.rates.get('EUR')?.forexSelling);
   * ```
   */
  async getRatesForDate(date: Date): Promise<TcmbRatesResult> {
    // TCMB formatı: YYYYMM/DDMMYYYY.xml
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const folder = `${year}${month}`;
    const filename = `${day}${month}${year}`;
    const url = `${this.TCMB_BASE_URL}/${folder}/${filename}.xml`;

    return this.fetchAndParseRates(url, filename);
  }

  /**
   * Tek bir para biriminin kurunu getirir
   *
   * @param currencyCode - Para birimi kodu (USD, EUR, vb.)
   * @param date - Tarih (opsiyonel, varsayılan: bugün)
   *
   * @example
   * ```typescript
   * const usd = await tcmb.getRate('USD');
   * console.log('USD:', usd?.forexSelling);
   *
   * const eurHistoric = await tcmb.getRate('EUR', new Date('2024-01-15'));
   * ```
   */
  async getRate(currencyCode: string, date?: Date): Promise<TcmbRate | undefined> {
    const result = date ? await this.getRatesForDate(date) : await this.getTodayRates();
    return result.rates.get(currencyCode.toUpperCase());
  }

  /**
   * Fatura için döviz kurunu getirir (ForexSelling / Unit)
   *
   * GİB faturaları için kullanılacak kur değeri.
   * Döviz satış kurunu birime bölerek hesaplar.
   *
   * @param currencyCode - Para birimi kodu (USD, EUR, vb.)
   * @param date - Tarih (opsiyonel, varsayılan: bugün)
   *
   * @example
   * ```typescript
   * const rate = await tcmb.getInvoiceRate('USD');
   * console.log(`1 USD = ${rate} TRY`);
   *
   * // Belirli bir tarih için
   * const historicRate = await tcmb.getInvoiceRate('EUR', new Date('2024-01-15'));
   * ```
   *
   * @throws {Error} Para birimi bulunamadığında
   */
  async getInvoiceRate(currencyCode: string, date?: Date): Promise<number> {
    const code = currencyCode.toUpperCase();

    // TRY için her zaman 1
    if (code === 'TRY') {
      return 1;
    }

    const rate = await this.getRate(code, date);

    if (!rate) {
      const dateStr = date ? date.toISOString().split('T')[0] : 'bugün';
      throw new Error(`TCMB kurları içinde ${code} bulunamadı (${dateStr})`);
    }

    // ForexSelling / Unit = 1 birim döviz için TRY karşılığı
    return rate.forexSelling / rate.unit;
  }

  /**
   * Tüm kurları para birimi kodlarının listesi olarak döner
   *
   * @param date - Tarih (opsiyonel, varsayılan: bugün)
   */
  async getAvailableCurrencies(date?: Date): Promise<string[]> {
    const result = date ? await this.getRatesForDate(date) : await this.getTodayRates();
    return Array.from(result.rates.keys());
  }

  /**
   * Cache'i temizler
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * URL'den kur verisi çeker ve parse eder
   */
  private async fetchAndParseRates(url: string, cacheKey: string): Promise<TcmbRatesResult> {
    // Cache kontrolü
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    try {
      const response = await axios.get<string>(url, {
        timeout: this.timeout,
        responseType: 'text',
        headers: {
          Accept: 'application/xml',
        },
      });

      const result = this.parseXml(response.data, url);

      // Cache'e kaydet
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`TCMB kur verisi bulunamadı: ${url} (404). Tarih hafta sonu veya tatil olabilir.`);
        }
        throw new Error(`TCMB kur verisi alınamadı: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * TCMB XML'ini parse eder
   */
  private parseXml(xml: string, source: string): TcmbRatesResult {
    const parsed = this.parser.parse(xml);

    // TCMB XML yapısı: Tarih_Date -> Currency[]
    const root = parsed.Tarih_Date;
    if (!root) {
      throw new Error('Geçersiz TCMB XML formatı: Tarih_Date bulunamadı');
    }

    // Tarih parse
    const dateStr = root['@_Date']; // "01/15/2024" veya "15.01.2024" formatı
    let date: Date;
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.');
      date = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      date = new Date(dateStr);
    }

    const rates = new Map<string, TcmbRate>();
    const currencies = Array.isArray(root.Currency) ? root.Currency : [root.Currency];

    for (const currency of currencies) {
      const code = currency['@_CurrencyCode'];
      if (!code) continue;

      const rate: TcmbRate = {
        currencyCode: code,
        currencyName: currency.Isim || currency.CurrencyName || '',
        unit: this.parseNumber(currency.Unit),
        forexBuying: this.parseNumber(currency.ForexBuying),
        forexSelling: this.parseNumber(currency.ForexSelling),
        banknoteBuying: this.parseNumber(currency.BanknoteBuying),
        banknoteSelling: this.parseNumber(currency.BanknoteSelling),
        crossRate: this.parseNumber(currency.CrossRateUSD) || this.parseNumber(currency.CrossRateOther),
      };

      rates.set(code, rate);
    }

    return {
      date,
      source,
      rates,
    };
  }

  /**
   * String'i number'a çevirir (virgül ve boşluk düzeltmesi ile)
   */
  private parseNumber(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    const str = String(value).replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }
}

/**
 * Varsayılan TCMB servisi instance'ı (singleton)
 *
 * @example
 * ```typescript
 * import { tcmb } from '@entegre/ets-sdk';
 *
 * const rate = await tcmb.getInvoiceRate('USD');
 * ```
 */
export const tcmb = new TcmbService();

/**
 * Yeni bir TCMB servisi oluşturur
 *
 * @example
 * ```typescript
 * const customTcmb = createTcmbService({
 *   cacheTtl: 30 * 60 * 1000, // 30 dakika
 *   timeout: 5000
 * });
 * ```
 */
export function createTcmbService(config?: TcmbServiceConfig): TcmbService {
  return new TcmbService(config);
}
