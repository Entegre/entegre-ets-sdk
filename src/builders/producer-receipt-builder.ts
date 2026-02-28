import type {
  ProducerReceipt,
  ProducerReceiptRequest,
  ProducerReceiptProfileId,
  Party,
  DocumentLine,
  Tax,
  Address,
  Person,
} from '../types';
import { TAX_CODES, UNIT_CODES } from '../constants';
import type { PartyInput, LineInput, CalculatedTotals } from './invoice-builder';

/**
 * Müstahsil makbuzu oluşturucu (Builder Pattern)
 *
 * @example
 * ```typescript
 * const receipt = ProducerReceiptBuilder.create()
 *   .withDate('2024-01-15')
 *   .withSupplier({
 *     taxId: '1234567890',
 *     name: 'Alıcı Firma',
 *     taxOffice: 'Kadıköy VD'
 *   })
 *   .withCustomer({
 *     taxId: '12345678901',
 *     name: 'Üretici',
 *     firstName: 'Ahmet',
 *     lastName: 'Yılmaz'
 *   })
 *   .addLine({
 *     itemCode: 'URUN-001',
 *     itemName: 'Tarım Ürünü',
 *     quantity: 100,
 *     price: 10,
 *     vatRate: 1
 *   })
 *   .build();
 * ```
 */
export class ProducerReceiptBuilder {
  private receiptId?: string;
  private profileId: ProducerReceiptProfileId | string = 'TEMELMUSTAHSILMAKBUZ';
  private issueDate: string;
  private currency: string = 'TRY';
  private notes: string[] = [];
  private supplier?: Party;
  private customer?: Party;
  private lines: DocumentLine[] = [];

  private constructor() {
    this.issueDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Yeni bir ProducerReceiptBuilder oluşturur
   */
  static create(): ProducerReceiptBuilder {
    return new ProducerReceiptBuilder();
  }

  /**
   * Makbuz numarası belirler
   */
  withId(id: string): ProducerReceiptBuilder {
    this.receiptId = id;
    return this;
  }

  /**
   * Makbuz profilini belirler
   * @param profile - TEMELMUSTAHSILMAKBUZ
   */
  withProfile(profile: ProducerReceiptProfileId | string): ProducerReceiptBuilder {
    this.profileId = profile;
    return this;
  }

  /**
   * Makbuz tarihini belirler
   * @param date - YYYY-MM-DD formatında tarih
   */
  withDate(date: string): ProducerReceiptBuilder {
    this.issueDate = date;
    return this;
  }

  /**
   * Para birimini belirler
   */
  withCurrency(currency: string): ProducerReceiptBuilder {
    this.currency = currency;
    return this;
  }

  /**
   * Not ekler
   */
  withNote(note: string): ProducerReceiptBuilder {
    this.notes.push(note);
    return this;
  }

  /**
   * Birden fazla not ekler
   */
  withNotes(notes: string[]): ProducerReceiptBuilder {
    this.notes.push(...notes);
    return this;
  }

  /**
   * Alıcı firma bilgilerini belirler (makbuzu düzenleyen)
   */
  withSupplier(input: PartyInput): ProducerReceiptBuilder {
    this.supplier = this.buildParty(input);
    return this;
  }

  /**
   * Üretici/satıcı bilgilerini belirler (ürünü satan çiftçi/üretici)
   */
  withCustomer(input: PartyInput): ProducerReceiptBuilder {
    this.customer = this.buildParty(input);
    return this;
  }

  /**
   * Makbuz satırı ekler
   */
  addLine(input: LineInput): ProducerReceiptBuilder {
    const vatRate = input.vatRate ?? 1; // Müstahsil genelde %1 stopaj
    const lineExtension = input.quantity * input.price;
    const taxAmount = this.roundCurrency(lineExtension * (vatRate / 100));

    const line: DocumentLine = {
      ItemCode: input.itemCode,
      ItemName: input.itemName,
      Description: input.description,
      InvoicedQuantity: input.quantity,
      IsoUnitCode: input.unitCode || UNIT_CODES.ADET,
      CurrencyId: this.currency,
      Price: input.price,
      LineExtensionAmount: lineExtension,
      Taxes: [
        {
          TaxCode: input.taxCode || TAX_CODES.STOPAJ,
          TaxName: input.taxName || 'Stopaj',
          Percent: vatRate,
          TaxAmount: taxAmount,
          ExemptionReason: input.exemptionReason,
          ExemptionReasonCode: input.exemptionReasonCode,
        },
      ],
    };

    this.lines.push(line);
    return this;
  }

  /**
   * Birden fazla satır ekler
   */
  addLines(inputs: LineInput[]): ProducerReceiptBuilder {
    inputs.forEach((input) => this.addLine(input));
    return this;
  }

  /**
   * Toplamları hesaplar
   */
  calculateTotals(): CalculatedTotals {
    let lineTotal = 0;
    let totalVat = 0;
    const taxBreakdown = new Map<string, { taxName: string; rate: number; base: number; amount: number }>();

    for (const line of this.lines) {
      const lineAmount = line.LineExtensionAmount || 0;
      lineTotal += lineAmount;

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

    const grandTotal = this.roundCurrency(lineTotal - totalVat); // Müstahsilde stopaj düşülür

    return {
      lineTotal: this.roundCurrency(lineTotal),
      totalVat: this.roundCurrency(totalVat),
      totalDiscount: 0,
      withholdingAmount: this.roundCurrency(totalVat),
      grandTotal,
      payableAmount: grandTotal,
      taxBreakdown,
    };
  }

  /**
   * Makbuz nesnesini oluşturur
   */
  build(): ProducerReceiptRequest {
    this.validate();

    const totals = this.calculateTotals();

    const receipt: ProducerReceipt = {
      ReceiptId: this.receiptId,
      ProfileId: this.profileId,
      IssueDate: this.issueDate,
      CurrencyId: this.currency,
      Notes: this.notes.length > 0 ? this.notes : undefined,
      SupplierParty: this.supplier!,
      CustomerParty: this.customer!,
      DocumentLines: this.lines,
      LegalMonetaryTotal: {
        LineExtensionAmount: totals.lineTotal,
        TaxExclusiveAmount: totals.lineTotal,
        TaxIncludedAmount: totals.grandTotal,
        AllowanceTotalAmount: totals.totalVat, // Stopaj kesintisi
        PayableAmount: totals.grandTotal,
      },
    };

    return {
      ProducerReceipt: receipt,
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

    if (input.firstName || input.lastName) {
      const person: Person = {
        FirstName: input.firstName || '',
        FamilyName: input.lastName || '',
      };
      party.Person = person;
    }

    return party;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private validate(): void {
    const errors: string[] = [];

    if (!this.supplier) {
      errors.push('Alıcı firma (supplier) bilgisi gerekli');
    }

    if (!this.customer) {
      errors.push('Üretici (customer) bilgisi gerekli');
    }

    if (this.lines.length === 0) {
      errors.push('En az bir makbuz satırı gerekli');
    }

    if (errors.length > 0) {
      throw new Error(`Müstahsil makbuzu doğrulama hatası:\n- ${errors.join('\n- ')}`);
    }
  }
}

/**
 * Hızlı müstahsil makbuzu oluşturucu factory fonksiyonu
 */
export function createProducerReceipt(): ProducerReceiptBuilder {
  return ProducerReceiptBuilder.create();
}
