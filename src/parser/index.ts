import type {
  Invoice,
  Party,
  DocumentLine,
  Tax,
  LegalMonetaryTotal,
  Address,
} from '../types';

/**
 * XML Parser sonucu
 */
export interface ParsedInvoice {
  /** Fatura UUID */
  uuid?: string;
  /** Fatura numarası */
  invoiceNumber?: string;
  /** Fatura tipi */
  invoiceType?: string;
  /** Profil ID */
  profileId?: string;
  /** Düzenleme tarihi */
  issueDate?: string;
  /** Para birimi */
  currency?: string;
  /** Gönderici */
  supplier?: Party;
  /** Alıcı */
  customer?: Party;
  /** Satırlar */
  lines?: DocumentLine[];
  /** Toplam tutarlar */
  totals?: LegalMonetaryTotal;
  /** Vergiler */
  taxes?: Tax[];
  /** Notlar */
  notes?: string[];
  /** Ham XML */
  rawXml?: string;
}

/**
 * Basit XML element parser
 */
function getElementText(xml: string, tagName: string): string | undefined {
  // Namespace prefix ile veya prefix olmadan eşleştir
  const patterns = [
    new RegExp(`<(?:[a-z]+:)?${tagName}[^>]*>([^<]*)<\\/(?:[a-z]+:)?${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*>([^<]*)<\\/${tagName}>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * XML element bloğunu çıkarır
 */
function getElementBlock(xml: string, tagName: string): string | undefined {
  const patterns = [
    new RegExp(`<(?:[a-z]+:)?${tagName}[^>]*>[\\s\\S]*?<\\/(?:[a-z]+:)?${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Birden fazla element bloğunu çıkarır
 */
function getElementBlocks(xml: string, tagName: string): string[] {
  const pattern = new RegExp(`<(?:[a-z]+:)?${tagName}[^>]*>[\\s\\S]*?<\\/(?:[a-z]+:)?${tagName}>`, 'gi');
  return xml.match(pattern) || [];
}

/**
 * Party bilgisini parse eder
 */
function parseParty(partyXml: string): Party {
  const party: Party = {
    PartyIdentification: '',
    PartyName: '',
  };

  // VKN/TCKN
  const schemeId = partyXml.match(/schemeID="([^"]+)"/i)?.[1];
  const partyId = getElementText(partyXml, 'ID');
  if (partyId) {
    party.PartyIdentification = partyId;
  }

  // Firma adı
  const partyName = getElementText(partyXml, 'Name') || getElementText(partyXml, 'PartyName');
  if (partyName) {
    party.PartyName = partyName;
  }

  // Vergi dairesi
  const taxScheme = getElementBlock(partyXml, 'PartyTaxScheme');
  if (taxScheme) {
    const taxOffice = getElementText(taxScheme, 'Name');
    if (taxOffice) {
      party.PartyTaxScheme = taxOffice;
    }
  }

  // Adres
  const postalAddress = getElementBlock(partyXml, 'PostalAddress');
  if (postalAddress) {
    const address: Address = {};

    const country = getElementText(postalAddress, 'Country') || getElementText(postalAddress, 'IdentificationCode');
    if (country) address.Country = country;

    const city = getElementText(postalAddress, 'CityName');
    if (city) address.CityName = city;

    const district = getElementText(postalAddress, 'CitySubdivisionName');
    if (district) address.CitySubdivisionName = district;

    const street = getElementText(postalAddress, 'StreetName');
    if (street) address.StreetName = street;

    const buildingNo = getElementText(postalAddress, 'BuildingNumber');
    if (buildingNo) address.BuildingNumber = buildingNo;

    const postalZone = getElementText(postalAddress, 'PostalZone');
    if (postalZone) address.PostalZone = postalZone;

    if (Object.keys(address).length > 0) {
      party.Address = address;
    }
  }

  return party;
}

/**
 * Vergi bilgisini parse eder
 */
function parseTax(taxXml: string): Tax {
  return {
    TaxCode: getElementText(taxXml, 'ID') || getElementText(taxXml, 'TaxTypeCode') || '',
    TaxName: getElementText(taxXml, 'Name') || getElementText(taxXml, 'TaxTypeName') || '',
    Percent: parseFloat(getElementText(taxXml, 'Percent') || '0'),
    TaxAmount: parseFloat(getElementText(taxXml, 'TaxAmount') || '0'),
    ExemptionReason: getElementText(taxXml, 'TaxExemptionReason'),
    ExemptionReasonCode: getElementText(taxXml, 'TaxExemptionReasonCode'),
  };
}

/**
 * Satır bilgisini parse eder
 */
function parseLine(lineXml: string): DocumentLine {
  const line: DocumentLine = {
    ItemCode: '',
    ItemName: '',
    InvoicedQuantity: 0,
    IsoUnitCode: 'C62',
    Price: 0,
  };

  // Item bilgileri
  const item = getElementBlock(lineXml, 'Item');
  if (item) {
    line.ItemName = getElementText(item, 'Name') || '';

    const sellersItemId = getElementBlock(item, 'SellersItemIdentification');
    if (sellersItemId) {
      line.ItemCode = getElementText(sellersItemId, 'ID') || '';
    }

    line.Description = getElementText(item, 'Description');
  }

  // Miktar
  const quantityMatch = lineXml.match(/InvoicedQuantity[^>]*unitCode="([^"]+)"[^>]*>([^<]+)</i);
  if (quantityMatch) {
    line.IsoUnitCode = quantityMatch[1];
    line.InvoicedQuantity = parseFloat(quantityMatch[2]);
  } else {
    const qty = getElementText(lineXml, 'InvoicedQuantity');
    if (qty) line.InvoicedQuantity = parseFloat(qty);
  }

  // Fiyat
  const priceAmount = getElementText(lineXml, 'PriceAmount');
  if (priceAmount) {
    line.Price = parseFloat(priceAmount);
  }

  // Satır tutarı
  const lineExtension = getElementText(lineXml, 'LineExtensionAmount');
  if (lineExtension) {
    line.LineExtensionAmount = parseFloat(lineExtension);
  }

  // Vergiler
  const taxBlocks = getElementBlocks(lineXml, 'TaxSubtotal');
  if (taxBlocks.length > 0) {
    line.Taxes = taxBlocks.map(parseTax);
  }

  return line;
}

/**
 * UBL-TR XML'den Invoice parse eder
 */
export function parseInvoiceXml(xml: string): ParsedInvoice {
  const result: ParsedInvoice = {
    rawXml: xml,
  };

  // UUID
  result.uuid = getElementText(xml, 'UUID');

  // Fatura numarası
  result.invoiceNumber = getElementText(xml, 'ID');

  // Tip
  result.invoiceType = getElementText(xml, 'InvoiceTypeCode');

  // Profil
  result.profileId = getElementText(xml, 'ProfileID');

  // Tarih
  result.issueDate = getElementText(xml, 'IssueDate');

  // Para birimi
  result.currency = getElementText(xml, 'DocumentCurrencyCode');

  // Gönderici
  const supplierParty = getElementBlock(xml, 'AccountingSupplierParty');
  if (supplierParty) {
    const party = getElementBlock(supplierParty, 'Party');
    if (party) {
      result.supplier = parseParty(party);
    }
  }

  // Alıcı
  const customerParty = getElementBlock(xml, 'AccountingCustomerParty');
  if (customerParty) {
    const party = getElementBlock(customerParty, 'Party');
    if (party) {
      result.customer = parseParty(party);
    }
  }

  // Satırlar
  const invoiceLines = getElementBlocks(xml, 'InvoiceLine');
  if (invoiceLines.length > 0) {
    result.lines = invoiceLines.map(parseLine);
  }

  // Toplam tutarlar
  const monetaryTotal = getElementBlock(xml, 'LegalMonetaryTotal');
  if (monetaryTotal) {
    result.totals = {
      LineExtensionAmount: parseFloat(getElementText(monetaryTotal, 'LineExtensionAmount') || '0'),
      TaxExclusiveAmount: parseFloat(getElementText(monetaryTotal, 'TaxExclusiveAmount') || '0'),
      TaxIncludedAmount: parseFloat(getElementText(monetaryTotal, 'TaxInclusiveAmount') || getElementText(monetaryTotal, 'TaxIncludedAmount') || '0'),
      AllowanceTotalAmount: parseFloat(getElementText(monetaryTotal, 'AllowanceTotalAmount') || '0'),
      PayableAmount: parseFloat(getElementText(monetaryTotal, 'PayableAmount') || '0'),
    };
  }

  // Vergi toplamları
  const taxTotals = getElementBlocks(xml, 'TaxSubtotal');
  if (taxTotals.length > 0) {
    result.taxes = taxTotals.map(parseTax);
  }

  // Notlar
  const notes = getElementBlocks(xml, 'Note');
  if (notes.length > 0) {
    result.notes = notes.map((noteXml) => {
      const text = noteXml.replace(/<[^>]+>/g, '').trim();
      return text;
    }).filter(Boolean);
  }

  return result;
}

/**
 * ParsedInvoice'ı Invoice tipine dönüştürür
 */
export function toInvoice(parsed: ParsedInvoice): Invoice {
  return {
    InvoiceId: parsed.invoiceNumber,
    InvoiceTypeCode: parsed.invoiceType || 'SATIS',
    ProfileId: parsed.profileId || 'TEMELFATURA',
    IssueDate: parsed.issueDate || new Date().toISOString().split('T')[0],
    DocumentCurrencyCode: parsed.currency,
    CurrencyId: parsed.currency,
    Notes: parsed.notes,
    SupplierParty: parsed.supplier || { PartyIdentification: '', PartyName: '' },
    CustomerParty: parsed.customer || { PartyIdentification: '', PartyName: '' },
    DocumentLines: parsed.lines || [],
    LegalMonetaryTotal: parsed.totals || {
      LineExtensionAmount: 0,
      PayableAmount: 0,
    },
    TaxTotals: parsed.taxes,
  };
}

/**
 * Base64 encoded XML'i decode edip parse eder
 */
export function parseBase64InvoiceXml(base64: string): ParsedInvoice {
  const xml = Buffer.from(base64, 'base64').toString('utf-8');
  return parseInvoiceXml(xml);
}

/**
 * XML içeriğinin fatura mı kontrol eder
 */
export function isInvoiceXml(xml: string): boolean {
  return xml.includes('Invoice') && (xml.includes('UBL') || xml.includes('urn:oasis'));
}

/**
 * XML içeriğinin irsaliye mi kontrol eder
 */
export function isDispatchXml(xml: string): boolean {
  return xml.includes('DespatchAdvice') || xml.includes('Despatch');
}
