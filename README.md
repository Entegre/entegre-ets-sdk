# @entegre/ets-sdk

[![npm version](https://img.shields.io/npm/v/@entegre/ets-sdk.svg)](https://www.npmjs.com/package/@entegre/ets-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@entegre/ets-sdk.svg)](https://www.npmjs.com/package/@entegre/ets-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Entegre ETS API için TypeScript/JavaScript SDK. E-Fatura, E-Arşiv, E-İrsaliye ve E-Müstahsil işlemlerini kolayca yapmanızı sağlar.

## Kurulum

```bash
npm install @entegre/ets-sdk
# veya
yarn add @entegre/ets-sdk
# veya
pnpm add @entegre/ets-sdk
```

## Hızlı Başlangıç

```typescript
import { EtsClient, UNIT_CODES, TAX_CODES } from '@entegre/ets-sdk';

// Client oluştur
const client = new EtsClient({
  baseUrl: 'https://ets.bulutix.com', // varsayılan
  integrator: 'UYM',
  softwareId: 'MY-APP'
});

// Kimlik doğrulama
await client.authenticate({
  partyId: '1234567890',
  username: 'kullanici',
  password: 'sifre'
});

// E-Fatura mükellefi kontrolü
const userCheck = await client.checkEInvoiceUser('9876543210');
console.log('E-Fatura mükellefi:', userCheck.data?.isActive);
```

## E-Fatura Gönderme

```typescript
const result = await client.sendInvoice({
  Invoice: {
    InvoiceTypeCode: 'SATIS',
    ProfileId: 'TEMELFATURA',
    IssueDate: '2024-01-15',
    DocumentCurrencyCode: 'TRY',
    SupplierParty: {
      PartyIdentification: '1234567890',
      PartyName: 'Satıcı Firma A.Ş.',
      PartyTaxScheme: 'Kadıköy VD',
      Address: {
        Country: 'Türkiye',
        CityName: 'İstanbul',
        CitySubdivisionName: 'Kadıköy'
      }
    },
    CustomerParty: {
      PartyIdentification: '9876543210',
      PartyName: 'Alıcı Firma Ltd.',
      PartyTaxScheme: 'Çankaya VD',
      Address: {
        Country: 'Türkiye',
        CityName: 'Ankara',
        CitySubdivisionName: 'Çankaya'
      }
    },
    DocumentLines: [
      {
        ItemCode: 'URUN-001',
        ItemName: 'Yazılım Lisansı',
        InvoicedQuantity: 1,
        IsoUnitCode: UNIT_CODES.ADET, // 'C62'
        Price: 1000,
        LineExtensionAmount: 1000,
        Taxes: [
          {
            TaxCode: TAX_CODES.KDV, // '0015'
            TaxName: 'KDV',
            Percent: 20,
            TaxAmount: 200
          }
        ]
      }
    ],
    LegalMonetaryTotal: {
      LineExtensionAmount: 1000,
      TaxExclusiveAmount: 1000,
      TaxIncludedAmount: 1200,
      PayableAmount: 1200
    },
    TaxTotals: [
      {
        TaxCode: '0015',
        TaxName: 'KDV',
        Percent: 20,
        TaxAmount: 200
      }
    ]
  },
  TargetCustomer: {
    PartyName: 'Alıcı Firma Ltd.',
    PartyIdentification: '9876543210',
    Alias: 'urn:mail:defaultpk@9876543210'
  }
});

console.log('UUID:', result.data?.uuid);
console.log('Fatura No:', result.data?.invoiceNumber);
```

## E-Arşiv Fatura Gönderme

```typescript
const result = await client.sendEArchiveInvoice({
  Invoice: {
    // ... fatura bilgileri (yukarıdaki gibi)
  },
  TargetCustomer: {
    PartyName: 'Alıcı Kişi',
    PartyIdentification: '12345678901', // TCKN
  },
  ArchiveInfo: {
    SendingType: 'ELEKTRONIK', // veya 'KAGIT'
    IsInternetSales: false
  }
});
```

## E-İrsaliye Gönderme

```typescript
const result = await client.sendDispatch({
  Dispatch: {
    ProfileId: 'TEMELIRSALIYE',
    IssueDate: '2024-01-15',
    DispatchTypeCode: 'SEVK',
    SupplierParty: { /* ... */ },
    CustomerParty: { /* ... */ },
    DocumentLines: [
      {
        ItemCode: 'URUN-001',
        ItemName: 'Ürün',
        InvoicedQuantity: 10,
        IsoUnitCode: UNIT_CODES.ADET,
        Price: 100
      }
    ]
  },
  TargetCustomer: {
    PartyName: 'Alıcı Firma',
    PartyIdentification: '9876543210',
    Alias: 'urn:mail:defaultpk@9876543210'
  }
});
```

## E-Müstahsil Makbuzu

```typescript
const result = await client.sendProducerReceipt({
  ProducerReceipt: {
    ProfileId: 'TEMELMUSTAHSILMAKBUZ',
    IssueDate: '2024-01-15',
    SupplierParty: { /* ... */ },
    CustomerParty: { /* ... */ },
    DocumentLines: [ /* ... */ ],
    LegalMonetaryTotal: { /* ... */ }
  }
});
```

## Döviz Kuru Sorgulama

```typescript
// Tek kur
const usdRate = await client.getExchangeRate('USD', '2024-01-15');
console.log('USD:', usdRate.data?.effectiveRate);

// Tüm kurlar
const allRates = await client.getAllExchangeRates('2024-01-15');
```

## API Referansı

### EtsClient Metodları

| Metod | Açıklama |
|-------|----------|
| `authenticate(credentials)` | Kimlik doğrulama |
| `setToken(token)` | Token ayarlama |
| `getToken()` | Token alma |
| `isAuthenticated()` | Kimlik durumu |

#### E-Fatura
| Metod | Açıklama |
|-------|----------|
| `checkEInvoiceUser(partyId)` | Mükellef sorgulama |
| `getUserAliases(partyId)` | Alias listesi |
| `sendInvoice(request)` | Fatura gönderme |
| `sendDraftInvoice(request)` | Taslak fatura |
| `getInvoiceStatus(uuid)` | Durum sorgulama |
| `respondInvoice(uuid, request)` | Yanıt (Kabul/Red) |
| `getInboxInvoices(query)` | Gelen faturalar |
| `getInvoicePdf(uuid)` | PDF indirme |

#### E-Arşiv
| Metod | Açıklama |
|-------|----------|
| `sendEArchiveInvoice(request)` | E-Arşiv fatura |
| `sendEArchiveInvoices(requests)` | Toplu gönderim |
| `getEArchiveStatus(uuid)` | Durum sorgulama |
| `cancelEArchive(uuid, date)` | İptal |
| `getEArchivePdf(uuid)` | PDF indirme |
| `getEArchiveList(query)` | Liste |

#### E-İrsaliye
| Metod | Açıklama |
|-------|----------|
| `checkEDispatchUser(partyId)` | Mükellef sorgulama |
| `getDispatchUserAliases(partyId)` | Alias listesi |
| `sendDispatch(request)` | İrsaliye gönderme |
| `sendDraftDispatch(request)` | Taslak irsaliye |
| `getDispatchStatus(uuid)` | Durum sorgulama |

#### E-Müstahsil
| Metod | Açıklama |
|-------|----------|
| `sendProducerReceipt(request)` | Makbuz gönderme |
| `sendProducerReceipts(requests)` | Toplu gönderim |
| `getProducerReceiptStatus(uuid)` | Durum sorgulama |

#### Döviz Kuru
| Metod | Açıklama |
|-------|----------|
| `getExchangeRate(currency, date)` | Tek kur |
| `getAllExchangeRates(date)` | Tüm kurlar |

## Sabitler

```typescript
import { UNIT_CODES, TAX_CODES, INVOICE_TYPES, INVOICE_PROFILES } from '@entegre/ets-sdk';

// Birim kodları
UNIT_CODES.ADET      // 'C62'
UNIT_CODES.KILOGRAM  // 'KGM'
UNIT_CODES.LITRE     // 'LTR'

// Vergi kodları
TAX_CODES.KDV        // '0015'
TAX_CODES.OTV_I      // '0003'

// Fatura tipleri
INVOICE_TYPES.SATIS       // 'SATIS'
INVOICE_TYPES.IADE        // 'IADE'
INVOICE_TYPES.TEVKIFAT    // 'TEVKIFAT'

// Fatura profilleri
INVOICE_PROFILES.TEMEL    // 'TEMELFATURA'
INVOICE_PROFILES.TICARI   // 'TICARIFATURA'
```

## Hata Yönetimi

```typescript
import { EtsError, AuthenticationError, GibError } from '@entegre/ets-sdk';

try {
  await client.sendInvoice(request);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Kimlik doğrulama hatası');
  } else if (error instanceof GibError) {
    console.error('GİB hatası:', error.gibCode);
  } else if (error instanceof EtsError) {
    console.error('API hatası:', error.message);
    console.error('HTTP kodu:', error.statusCode);
  }
}
```

## Entegratörler

| Kod | Entegratör |
|-----|------------|
| `UYM` | Uyumsoft |
| `UYK` | Uyumsoft Kurumsal |
| `IZI` | İzibiz |
| `DGN` | Doğan E-Dönüşüm |
| `MYS` | Mysoft |

## Lisans

MIT
