import type {
  Invoice,
  InvoiceRequest,
  InvoiceTypeCode,
  InvoiceProfileId,
  Party,
  DocumentLine,
  Tax,
  TargetCustomer,
  Address,
  Person,
} from '../types';
import { TAX_CODES, UNIT_CODES } from '../constants';
import { tcmb } from '../tcmb';

/**
 * Satır ekleme için basitleştirilmiş tip
 */
export interface LineInput {
  /** Ürün kodu */
  itemCode: string;
  /** Ürün adı */
  itemName: string;
  /** Açıklama */
  description?: string;
  /** Miktar */
  quantity: number;
  /** Birim kodu (varsayılan: C62 - Adet) */
  unitCode?: string;
  /** Birim fiyat */
  price: number;
  /** KDV oranı (varsayılan: 20) */
  vatRate?: number;
  /** Vergi kodu (varsayılan: 0015 - KDV) */
  taxCode?: string;
  /** Vergi adı (varsayılan: KDV) */
  taxName?: string;
  /** Muafiyet sebebi */
  exemptionReason?: string;
  /** Muafiyet kodu */
  exemptionReasonCode?: string;
  /** İndirim tutarı */
  discountAmount?: number;
  /** İndirim oranı (%) */
  discountRate?: number;
}

/**
 * Tevkifat (Withholding) bilgisi
 */
export interface WithholdingInfo {
  /** Tevkifat oranı (örn: 5/10 için 50, 9/10 için 90) */
  rate: number;
  /** Tevkifat sebebi kodu */
  reasonCode?: string;
  /** Tevkifat sebebi */
  reason?: string;
}

/**
 * Genel indirim bilgisi
 */
export interface DiscountInfo {
  /** İndirim tutarı */
  amount?: number;
  /** İndirim oranı (%) */
  rate?: number;
  /** İndirim açıklaması */
  reason?: string;
}

/**
 * Taraf ekleme için basitleştirilmiş tip
 */
export interface PartyInput {
  /** VKN veya TCKN */
  taxId: string;
  /** Firma/kişi adı */
  name: string;
  /** Vergi dairesi */
  taxOffice?: string;
  /** Alias */
  alias?: string;
  /** Ülke */
  country?: string;
  /** Şehir */
  city?: string;
  /** İlçe */
  district?: string;
  /** Adres */
  address?: string;
  /** Bina no */
  buildingNo?: string;
  /** Posta kodu */
  postalCode?: string;
  /** Ad (gerçek kişi için) */
  firstName?: string;
  /** Soyad (gerçek kişi için) */
  lastName?: string;
}

/**
 * Hesaplanmış toplamlar
 */
export interface CalculatedTotals {
  /** Satır toplamı (KDV hariç) */
  lineTotal: number;
  /** Toplam KDV */
  totalVat: number;
  /** Toplam indirim */
  totalDiscount: number;
  /** Tevkifat tutarı */
  withholdingAmount: number;
  /** Genel toplam (KDV dahil) */
  grandTotal: number;
  /** Ödenecek tutar (tevkifat düşülmüş) */
  payableAmount: number;
  /** Vergi detayları (kod bazında gruplu) */
  taxBreakdown: Map<string, { taxName: string; rate: number; base: number; amount: number }>;
}

/**
 * Fatura oluşturucu (Builder Pattern)
 *
 * @example
 * ```typescript
 * const invoice = InvoiceBuilder.create()
 *   .withType('SATIS')
 *   .withProfile('TEMELFATURA')
 *   .withDate('2024-01-15')
 *   .withCurrency('TRY')
 *   .withSupplier({
 *     taxId: '1234567890',
 *     name: 'Satıcı Firma',
 *     taxOffice: 'Kadıköy VD',
 *     city: 'İstanbul'
 *   })
 *   .withCustomer({
 *     taxId: '9876543210',
 *     name: 'Alıcı Firma',
 *     taxOffice: 'Çankaya VD'
 *   })
 *   .addLine({
 *     itemCode: 'URUN-001',
 *     itemName: 'Yazılım Lisansı',
 *     quantity: 1,
 *     price: 1000,
 *     vatRate: 20
 *   })
 *   .addLine({
 *     itemCode: 'URUN-002',
 *     itemName: 'Destek Hizmeti',
 *     quantity: 12,
 *     price: 100,
 *     vatRate: 20
 *   })
 *   .withNote('Fatura notu')
 *   .build();
 *
 * // Toplamlar otomatik hesaplanır:
 * // - Satır toplamı: 2200 TRY
 * // - KDV: 440 TRY
 * // - Genel toplam: 2640 TRY
 * ```
 */
export class InvoiceBuilder {
  private invoiceId?: string;
  private invoiceType: InvoiceTypeCode | string = 'SATIS';
  private profileId: InvoiceProfileId | string = 'TEMELFATURA';
  private issueDate: string;
  private currency: string = 'TRY';
  private notes: string[] = [];
  private supplier?: Party;
  private customer?: Party;
  private lines: DocumentLine[] = [];
  private targetCustomer?: TargetCustomer;
  private isDraft: boolean = false;
  private withholding?: WithholdingInfo;
  private generalDiscount?: DiscountInfo;
  private exchangeRate?: number;

  private constructor() {
    // Varsayılan tarih: bugün
    this.issueDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Yeni bir InvoiceBuilder oluşturur
   */
  static create(): InvoiceBuilder {
    return new InvoiceBuilder();
  }

  /**
   * Fatura numarası belirler
   */
  withId(id: string): InvoiceBuilder {
    this.invoiceId = id;
    return this;
  }

  /**
   * Fatura tipini belirler
   * @param type - SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI
   */
  withType(type: InvoiceTypeCode | string): InvoiceBuilder {
    this.invoiceType = type;
    return this;
  }

  /**
   * Fatura profilini belirler
   * @param profile - TEMELFATURA, TICARIFATURA, IHRACAT, YOLCUBERABERI, EARSIVFATURA
   */
  withProfile(profile: InvoiceProfileId | string): InvoiceBuilder {
    this.profileId = profile;
    return this;
  }

  /**
   * Fatura tarihini belirler
   * @param date - YYYY-MM-DD formatında tarih
   */
  withDate(date: string): InvoiceBuilder {
    this.issueDate = date;
    return this;
  }

  /**
   * Para birimini belirler
   * @param currency - TRY, USD, EUR, vb.
   */
  withCurrency(currency: string): InvoiceBuilder {
    this.currency = currency;
    return this;
  }

  /**
   * Döviz kurunu manuel olarak belirler
   * @param rate - Döviz kuru
   */
  withExchangeRate(rate: number): InvoiceBuilder {
    this.exchangeRate = rate;
    return this;
  }

  /**
   * TCMB'den otomatik döviz kuru çeker ve ayarlar
   *
   * Fatura para birimi TRY ise kur 1 olarak ayarlanır.
   * Diğer para birimleri için TCMB döviz satış kuru kullanılır.
   *
   * @param currencyCode - Para birimi kodu (opsiyonel, varsayılan: fatura para birimi)
   * @param date - Kur tarihi (opsiyonel, varsayılan: fatura tarihi veya bugün)
   *
   * @example
   * ```typescript
   * const invoice = await InvoiceBuilder.create()
   *   .withCurrency('USD')
   *   .withDate('2024-01-15')
   *   .withAutoExchangeRate()
   *   .then(builder => builder
   *     .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
   *     .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
   *     .addLine({ itemCode: 'PRD', itemName: 'Ürün', quantity: 1, price: 100 })
   *     .build()
   *   );
   * ```
   *
   * @returns Promise<InvoiceBuilder> - Zincirleme için builder döner
   */
  async withAutoExchangeRate(currencyCode?: string, date?: Date): Promise<InvoiceBuilder> {
    const currency = currencyCode || this.currency;

    // TRY için kur 1
    if (currency === 'TRY') {
      this.exchangeRate = 1;
      return this;
    }

    // Kur tarihi: parametre > fatura tarihi > bugün
    let rateDate: Date;
    if (date) {
      rateDate = date;
    } else if (this.issueDate) {
      rateDate = new Date(this.issueDate);
    } else {
      rateDate = new Date();
    }

    // TCMB'den kur çek
    const rate = await tcmb.getInvoiceRate(currency, rateDate);
    this.exchangeRate = rate;

    // Kur notu ekle
    const dateStr = rateDate.toISOString().split('T')[0];
    this.withNote(`Döviz Kuru: 1 ${currency} = ${rate.toFixed(4)} TRY (TCMB ${dateStr})`);

    return this;
  }

  /**
   * Taslak olarak işaretler
   */
  asDraft(): InvoiceBuilder {
    this.isDraft = true;
    return this;
  }

  /**
   * Not ekler
   */
  withNote(note: string): InvoiceBuilder {
    this.notes.push(note);
    return this;
  }

  /**
   * Birden fazla not ekler
   */
  withNotes(notes: string[]): InvoiceBuilder {
    this.notes.push(...notes);
    return this;
  }

  /**
   * Gönderici (satıcı) bilgilerini belirler
   */
  withSupplier(input: PartyInput): InvoiceBuilder {
    this.supplier = this.buildParty(input);
    return this;
  }

  /**
   * Alıcı (müşteri) bilgilerini belirler
   */
  withCustomer(input: PartyInput): InvoiceBuilder {
    this.customer = this.buildParty(input);

    // Otomatik olarak TargetCustomer da ayarla
    this.targetCustomer = {
      PartyName: input.name,
      PartyIdentification: input.taxId,
      Alias: input.alias,
    };

    return this;
  }

  /**
   * Hedef müşteri bilgilerini ayrıca belirler (opsiyonel)
   */
  withTargetCustomer(target: TargetCustomer): InvoiceBuilder {
    this.targetCustomer = target;
    return this;
  }

  /**
   * Tevkifat bilgisi ekler
   * @param rate - Tevkifat oranı (örn: 5/10 için 50, 9/10 için 90)
   * @param reasonCode - Tevkifat sebebi kodu
   * @param reason - Tevkifat sebebi açıklaması
   *
   * @example
   * ```typescript
   * builder.withWithholding(90, '603', 'Güvenlik Hizmetleri')
   * ```
   */
  withWithholding(rate: number, reasonCode?: string, reason?: string): InvoiceBuilder {
    this.withholding = { rate, reasonCode, reason };
    this.invoiceType = 'TEVKIFAT';
    if (reason) {
      this.withNote(`Tevkifat: ${reason} (${rate / 10}/10)`);
    }
    return this;
  }

  /**
   * Genel indirim ekler (tüm faturaya uygulanır)
   * @param amount - İndirim tutarı
   * @param reason - İndirim sebebi
   */
  withDiscountAmount(amount: number, reason?: string): InvoiceBuilder {
    this.generalDiscount = { amount, reason };
    if (reason) {
      this.withNote(`İndirim: ${reason}`);
    }
    return this;
  }

  /**
   * Genel indirim oranı ekler (tüm faturaya uygulanır)
   * @param rate - İndirim oranı (%)
   * @param reason - İndirim sebebi
   */
  withDiscountRate(rate: number, reason?: string): InvoiceBuilder {
    this.generalDiscount = { rate, reason };
    if (reason) {
      this.withNote(`İndirim: %${rate} - ${reason}`);
    }
    return this;
  }

  /**
   * Fatura satırı ekler
   */
  addLine(input: LineInput): InvoiceBuilder {
    const vatRate = input.vatRate ?? 20;
    let lineExtension = input.quantity * input.price;

    // Satır indirimi uygula
    let lineDiscount = 0;
    if (input.discountAmount) {
      lineDiscount = input.discountAmount;
    } else if (input.discountRate) {
      lineDiscount = this.roundCurrency(lineExtension * (input.discountRate / 100));
    }

    // İndirim sonrası tutar
    const lineExtensionAfterDiscount = lineExtension - lineDiscount;
    const taxAmount = this.roundCurrency(lineExtensionAfterDiscount * (vatRate / 100));

    const line: DocumentLine = {
      ItemCode: input.itemCode,
      ItemName: input.itemName,
      Description: input.description,
      InvoicedQuantity: input.quantity,
      IsoUnitCode: input.unitCode || UNIT_CODES.ADET,
      CurrencyId: this.currency,
      Price: input.price,
      LineExtensionAmount: lineExtensionAfterDiscount,
      Taxes: [
        {
          TaxCode: input.taxCode || TAX_CODES.KDV,
          TaxName: input.taxName || 'KDV',
          Percent: vatRate,
          TaxAmount: taxAmount,
          ExemptionReason: input.exemptionReason,
          ExemptionReasonCode: input.exemptionReasonCode,
        },
      ],
    };

    // Satır indirimi metadata olarak sakla
    if (lineDiscount > 0) {
      (line as DocumentLine & { _discount?: number })._discount = lineDiscount;
    }

    this.lines.push(line);
    return this;
  }

  /**
   * Birden fazla satır ekler
   */
  addLines(inputs: LineInput[]): InvoiceBuilder {
    inputs.forEach((input) => this.addLine(input));
    return this;
  }

  /**
   * Toplamları hesaplar (build öncesi önizleme için)
   */
  calculateTotals(): CalculatedTotals {
    let lineTotal = 0;
    let totalVat = 0;
    let totalLineDiscount = 0;
    const taxBreakdown = new Map<string, { taxName: string; rate: number; base: number; amount: number }>();

    for (const line of this.lines) {
      const lineAmount = line.LineExtensionAmount || 0;
      lineTotal += lineAmount;

      // Satır indirimleri
      const lineDiscount = (line as DocumentLine & { _discount?: number })._discount || 0;
      totalLineDiscount += lineDiscount;

      if (line.Taxes) {
        for (const tax of line.Taxes) {
          totalVat += tax.TaxAmount;

          const key = `${tax.TaxCode}-${tax.Percent}`;
          const existing = taxBreakdown.get(key);

          if (existing) {
            existing.base += lineAmount;
            existing.amount += tax.TaxAmount;
          } else {
            taxBreakdown.set(key, {
              taxName: tax.TaxName,
              rate: tax.Percent,
              base: lineAmount,
              amount: tax.TaxAmount,
            });
          }
        }
      }
    }

    // Genel indirim hesapla
    let generalDiscountAmount = 0;
    if (this.generalDiscount) {
      if (this.generalDiscount.amount) {
        generalDiscountAmount = this.generalDiscount.amount;
      } else if (this.generalDiscount.rate) {
        generalDiscountAmount = this.roundCurrency(lineTotal * (this.generalDiscount.rate / 100));
      }
    }

    const totalDiscount = totalLineDiscount + generalDiscountAmount;

    // KDV dahil toplam
    const grandTotal = this.roundCurrency(lineTotal + totalVat);

    // Tevkifat hesapla
    let withholdingAmount = 0;
    if (this.withholding) {
      // Tevkifat KDV üzerinden hesaplanır
      withholdingAmount = this.roundCurrency(totalVat * (this.withholding.rate / 100));
    }

    // Ödenecek tutar
    const payableAmount = this.roundCurrency(grandTotal - withholdingAmount);

    return {
      lineTotal: this.roundCurrency(lineTotal),
      totalVat: this.roundCurrency(totalVat),
      totalDiscount: this.roundCurrency(totalDiscount),
      withholdingAmount,
      grandTotal,
      payableAmount,
      taxBreakdown,
    };
  }

  /**
   * Fatura nesnesini oluşturur
   */
  build(): InvoiceRequest {
    this.validate();

    const totals = this.calculateTotals();

    const invoice: Invoice = {
      IsDraft: this.isDraft,
      InvoiceId: this.invoiceId,
      InvoiceTypeCode: this.invoiceType,
      ProfileId: this.profileId,
      IssueDate: this.issueDate,
      DocumentCurrencyCode: this.currency,
      CurrencyId: this.currency,
      ExchangeRate: this.exchangeRate,
      Notes: this.notes.length > 0 ? this.notes : undefined,
      SupplierParty: this.supplier!,
      CustomerParty: this.customer!,
      DocumentLines: this.lines.map((line) => {
        // _discount field'ını kaldır
        const { _discount, ...cleanLine } = line as DocumentLine & { _discount?: number };
        return cleanLine;
      }),
      LegalMonetaryTotal: {
        LineExtensionAmount: totals.lineTotal,
        TaxExclusiveAmount: totals.lineTotal,
        TaxIncludedAmount: totals.grandTotal,
        AllowanceTotalAmount: totals.totalDiscount,
        PayableAmount: totals.payableAmount,
      },
      TaxTotals: this.buildTaxTotals(totals.taxBreakdown, totals.withholdingAmount),
    };

    return {
      Invoice: invoice,
      TargetCustomer: this.targetCustomer,
    };
  }

  /**
   * E-Arşiv faturası olarak oluşturur
   */
  buildAsArchive(sendingType: 'ELEKTRONIK' | 'KAGIT' = 'ELEKTRONIK', isInternetSales: boolean = false) {
    const request = this.build();

    return {
      ...request,
      ArchiveInfo: {
        SendingType: sendingType,
        IsInternetSales: isInternetSales,
      },
    };
  }

  // ==================== PRIVATE METHODS ====================

  private buildParty(input: PartyInput): Party {
    const address: Address = {};

    if (input.country) address.Country = input.country;
    if (input.city) address.CityName = input.city;
    if (input.district) address.CitySubdivisionName = input.district;
    if (input.address) address.StreetName = input.address;
    if (input.buildingNo) address.BuildingNumber = input.buildingNo;
    if (input.postalCode) address.PostalZone = input.postalCode;

    const party: Party = {
      PartyIdentification: input.taxId,
      PartyName: input.name,
      PartyTaxScheme: input.taxOffice,
      Alias: input.alias,
      Address: Object.keys(address).length > 0 ? address : undefined,
    };

    // Gerçek kişi bilgileri
    if (input.firstName || input.lastName) {
      const person: Person = {
        FirstName: input.firstName || '',
        FamilyName: input.lastName || '',
      };
      party.Person = person;
    }

    return party;
  }

  private buildTaxTotals(
    taxBreakdown: Map<string, { taxName: string; rate: number; base: number; amount: number }>,
    withholdingAmount: number = 0
  ): Tax[] {
    const taxes: Tax[] = [];

    taxBreakdown.forEach((value, key) => {
      const [taxCode] = key.split('-');
      taxes.push({
        TaxCode: taxCode,
        TaxName: value.taxName,
        Percent: value.rate,
        TaxAmount: this.roundCurrency(value.amount),
      });
    });

    // Tevkifat varsa ekle
    if (withholdingAmount > 0 && this.withholding) {
      taxes.push({
        TaxCode: TAX_CODES.KDV_TEVKIFAT,
        TaxName: 'KDV Tevkifatı',
        Percent: this.withholding.rate,
        TaxAmount: withholdingAmount,
        ExemptionReasonCode: this.withholding.reasonCode,
        ExemptionReason: this.withholding.reason,
      });
    }

    return taxes;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.supplier) {
      errors.push('Gönderici (supplier) bilgisi gerekli');
    }

    if (!this.customer) {
      errors.push('Alıcı (customer) bilgisi gerekli');
    }

    if (this.lines.length === 0) {
      errors.push('En az bir fatura satırı gerekli');
    }

    if (errors.length > 0) {
      throw new Error(`Fatura doğrulama hatası:\n- ${errors.join('\n- ')}`);
    }
  }
}

/**
 * Hızlı fatura oluşturucu factory fonksiyonu
 */
export function createInvoice(): InvoiceBuilder {
  return InvoiceBuilder.create();
}
