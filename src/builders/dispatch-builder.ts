import type {
  Dispatch,
  DispatchRequest,
  DispatchTypeCode,
  DispatchProfileId,
  Party,
  DocumentLine,
  TargetCustomer,
  Address,
  Person,
} from '../types';
import { UNIT_CODES } from '../constants';
import type { PartyInput } from './invoice-builder';

/**
 * İrsaliye satırı için basitleştirilmiş tip
 */
export interface DispatchLineInput {
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
  /** Birim fiyat (opsiyonel - irsaliyede zorunlu değil) */
  price?: number;
}

/**
 * İrsaliye oluşturucu (Builder Pattern)
 *
 * @example
 * ```typescript
 * const dispatch = DispatchBuilder.create()
 *   .withType('SEVK')
 *   .withDate('2024-01-15')
 *   .withSupplier({
 *     taxId: '1234567890',
 *     name: 'Gönderici Firma',
 *     taxOffice: 'Kadıköy VD',
 *     city: 'İstanbul'
 *   })
 *   .withCustomer({
 *     taxId: '9876543210',
 *     name: 'Alıcı Firma',
 *     alias: 'urn:mail:defaultpk@9876543210'
 *   })
 *   .addLine({
 *     itemCode: 'URUN-001',
 *     itemName: 'Ürün',
 *     quantity: 100
 *   })
 *   .build();
 * ```
 */
export class DispatchBuilder {
  private dispatchId?: string;
  private dispatchType: DispatchTypeCode | string = 'SEVK';
  private profileId: DispatchProfileId | string = 'TEMELIRSALIYE';
  private issueDate: string;
  private currency: string = 'TRY';
  private notes: string[] = [];
  private supplier?: Party;
  private customer?: Party;
  private lines: DocumentLine[] = [];
  private targetCustomer?: TargetCustomer;

  private constructor() {
    this.issueDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Yeni bir DispatchBuilder oluşturur
   */
  static create(): DispatchBuilder {
    return new DispatchBuilder();
  }

  /**
   * İrsaliye numarası belirler
   */
  withId(id: string): DispatchBuilder {
    this.dispatchId = id;
    return this;
  }

  /**
   * İrsaliye tipini belirler
   * @param type - SEVK, MATBUDAN
   */
  withType(type: DispatchTypeCode | string): DispatchBuilder {
    this.dispatchType = type;
    return this;
  }

  /**
   * İrsaliye profilini belirler
   * @param profile - TEMELIRSALIYE
   */
  withProfile(profile: DispatchProfileId | string): DispatchBuilder {
    this.profileId = profile;
    return this;
  }

  /**
   * İrsaliye tarihini belirler
   * @param date - YYYY-MM-DD formatında tarih
   */
  withDate(date: string): DispatchBuilder {
    this.issueDate = date;
    return this;
  }

  /**
   * Para birimini belirler
   */
  withCurrency(currency: string): DispatchBuilder {
    this.currency = currency;
    return this;
  }

  /**
   * Not ekler
   */
  withNote(note: string): DispatchBuilder {
    this.notes.push(note);
    return this;
  }

  /**
   * Birden fazla not ekler
   */
  withNotes(notes: string[]): DispatchBuilder {
    this.notes.push(...notes);
    return this;
  }

  /**
   * Gönderici bilgilerini belirler
   */
  withSupplier(input: PartyInput): DispatchBuilder {
    this.supplier = this.buildParty(input);
    return this;
  }

  /**
   * Alıcı bilgilerini belirler
   */
  withCustomer(input: PartyInput): DispatchBuilder {
    this.customer = this.buildParty(input);

    this.targetCustomer = {
      PartyName: input.name,
      PartyIdentification: input.taxId,
      Alias: input.alias,
    };

    return this;
  }

  /**
   * Hedef müşteri bilgilerini ayrıca belirler
   */
  withTargetCustomer(target: TargetCustomer): DispatchBuilder {
    this.targetCustomer = target;
    return this;
  }

  /**
   * İrsaliye satırı ekler
   */
  addLine(input: DispatchLineInput): DispatchBuilder {
    const line: DocumentLine = {
      ItemCode: input.itemCode,
      ItemName: input.itemName,
      Description: input.description,
      InvoicedQuantity: input.quantity,
      IsoUnitCode: input.unitCode || UNIT_CODES.ADET,
      CurrencyId: this.currency,
      Price: input.price || 0,
      LineExtensionAmount: input.price ? input.quantity * input.price : undefined,
    };

    this.lines.push(line);
    return this;
  }

  /**
   * Birden fazla satır ekler
   */
  addLines(inputs: DispatchLineInput[]): DispatchBuilder {
    inputs.forEach((input) => this.addLine(input));
    return this;
  }

  /**
   * İrsaliye nesnesini oluşturur
   */
  build(): DispatchRequest {
    this.validate();

    const dispatch: Dispatch = {
      DispatchId: this.dispatchId,
      ProfileId: this.profileId,
      IssueDate: this.issueDate,
      DispatchTypeCode: this.dispatchType,
      CurrencyId: this.currency,
      Notes: this.notes.length > 0 ? this.notes : undefined,
      SupplierParty: this.supplier!,
      CustomerParty: this.customer!,
      DocumentLines: this.lines,
    };

    return {
      Dispatch: dispatch,
      TargetCustomer: this.targetCustomer,
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

  private validate(): void {
    const errors: string[] = [];

    if (!this.supplier) {
      errors.push('Gönderici (supplier) bilgisi gerekli');
    }

    if (!this.customer) {
      errors.push('Alıcı (customer) bilgisi gerekli');
    }

    if (this.lines.length === 0) {
      errors.push('En az bir irsaliye satırı gerekli');
    }

    if (errors.length > 0) {
      throw new Error(`İrsaliye doğrulama hatası:\n- ${errors.join('\n- ')}`);
    }
  }
}

/**
 * Hızlı irsaliye oluşturucu factory fonksiyonu
 */
export function createDispatch(): DispatchBuilder {
  return DispatchBuilder.create();
}
