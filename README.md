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

## Builder Pattern ile Kolay Fatura Oluşturma (Önerilen)

```typescript
import { EtsClient, InvoiceBuilder, createInvoice } from '@entegre/ets-sdk';

// Builder ile fatura oluştur - toplamlar otomatik hesaplanır
const invoiceRequest = InvoiceBuilder.create()
  .withType('SATIS')
  .withProfile('TEMELFATURA')
  .withDate('2024-01-15')
  .withCurrency('TRY')
  .withSupplier({
    taxId: '1234567890',
    name: 'Satıcı Firma A.Ş.',
    taxOffice: 'Kadıköy VD',
    city: 'İstanbul',
    district: 'Kadıköy'
  })
  .withCustomer({
    taxId: '9876543210',
    name: 'Alıcı Firma Ltd.',
    taxOffice: 'Çankaya VD',
    city: 'Ankara'
  })
  .addLine({
    itemCode: 'URUN-001',
    itemName: 'Yazılım Lisansı',
    quantity: 1,
    price: 1000,
    vatRate: 20
  })
  .addLine({
    itemCode: 'URUN-002',
    itemName: 'Destek Hizmeti',
    quantity: 12,
    price: 100,
    vatRate: 20
  })
  .withNote('Fatura notu')
  .build();

// Toplamlar otomatik hesaplanır:
// - Satır toplamı: 2200 TRY
// - KDV: 440 TRY
// - Genel toplam: 2640 TRY

// Faturayı gönder
const result = await client.sendInvoice(invoiceRequest);
console.log('UUID:', result.data?.uuid);

// E-Arşiv için buildAsArchive() kullanılabilir
const archiveRequest = InvoiceBuilder.create()
  // ... aynı zincir
  .buildAsArchive('ELEKTRONIK', false);

await client.sendEArchiveInvoice(archiveRequest);
```

### Alternatif: createInvoice() Factory Fonksiyonu

```typescript
const invoice = createInvoice()
  .withType('SATIS')
  .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
  .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
  .addLine({ itemCode: '001', itemName: 'Ürün', quantity: 1, price: 100 })
  .build();
```

### Toplamları Önizleme

```typescript
const builder = createInvoice()
  .addLine({ itemCode: '001', itemName: 'Ürün A', quantity: 2, price: 500, vatRate: 20 })
  .addLine({ itemCode: '002', itemName: 'Ürün B', quantity: 1, price: 1000, vatRate: 10 });

// Build öncesi toplamları görüntüle
const totals = builder.calculateTotals();
console.log('Satır toplamı:', totals.lineTotal);   // 2000
console.log('Toplam KDV:', totals.totalVat);        // 300 (200 + 100)
console.log('Genel toplam:', totals.grandTotal);    // 2300

// Vergi detayları
totals.taxBreakdown.forEach((tax, key) => {
  console.log(`${tax.taxName} %${tax.rate}: ${tax.amount} TRY`);
});
```

## E-İrsaliye Builder

```typescript
import { DispatchBuilder, createDispatch } from '@entegre/ets-sdk';

const dispatchRequest = DispatchBuilder.create()
  .withType('SEVK')
  .withDate('2024-01-15')
  .withSupplier({
    taxId: '1234567890',
    name: 'Gönderici Firma',
    taxOffice: 'Kadıköy VD',
    city: 'İstanbul'
  })
  .withCustomer({
    taxId: '9876543210',
    name: 'Alıcı Firma',
    alias: 'urn:mail:defaultpk@9876543210'
  })
  .addLine({
    itemCode: 'URUN-001',
    itemName: 'Ürün',
    quantity: 100
  })
  .addLine({
    itemCode: 'URUN-002',
    itemName: 'Başka Ürün',
    quantity: 50,
    unitCode: 'KGM' // Kilogram
  })
  .build();

await client.sendDispatch(dispatchRequest);
```

## E-Müstahsil Builder

```typescript
import { ProducerReceiptBuilder, createProducerReceipt } from '@entegre/ets-sdk';

const receiptRequest = ProducerReceiptBuilder.create()
  .withDate('2024-01-15')
  .withSupplier({
    taxId: '1234567890',
    name: 'Alıcı Firma (Makbuzu düzenleyen)',
    taxOffice: 'Kadıköy VD'
  })
  .withCustomer({
    taxId: '12345678901',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    name: 'Ahmet Yılmaz'
  })
  .addLine({
    itemCode: 'TARIM-001',
    itemName: 'Buğday',
    quantity: 1000,
    price: 10,
    vatRate: 1  // %1 Stopaj
  })
  .build();

// Toplamlar otomatik hesaplanır:
// - Satır toplamı: 10000 TRY
// - Stopaj kesintisi: 100 TRY
// - Ödenecek: 9900 TRY

await client.sendProducerReceipt(receiptRequest);
```

## Doğrulama (Validation)

```typescript
import {
  validateVKN,
  validateTCKN,
  validateTaxId,
  validateIBAN,
  Validator
} from '@entegre/ets-sdk';

// Tek tek doğrulama
const vknResult = validateVKN('1234567890');
if (!vknResult.valid) {
  console.error('VKN hatası:', vknResult.errors);
}

const tcknResult = validateTCKN('12345678901');
if (!tcknResult.valid) {
  console.error('TCKN hatası:', tcknResult.errors);
}

// Otomatik VKN/TCKN tespiti (10 hane = VKN, 11 hane = TCKN)
const taxIdResult = validateTaxId('1234567890');

// IBAN doğrulama
const ibanResult = validateIBAN('TR330006100519786457841326');

// Zincirleme doğrulama
const result = Validator.create()
  .taxId('1234567890', 'supplierTaxId')
  .taxId('9876543210', 'customerTaxId')
  .date('2024-01-15', 'issueDate')
  .currency('TRY', 'currency')
  .positiveNumber(100, 'quantity')
  .required('Ürün Adı', 'itemName')
  .validate();

if (!result.valid) {
  console.error('Doğrulama hataları:', result.errors);
}

// Hata varsa exception fırlat
Validator.create()
  .taxId(customerTaxId)
  .date(issueDate)
  .throwIfInvalid();
```

### Doğrulama Fonksiyonları

| Fonksiyon | Açıklama |
|-----------|----------|
| `validateVKN(vkn)` | 10 haneli VKN doğrulama (algoritma kontrolü dahil) |
| `validateTCKN(tckn)` | 11 haneli TCKN doğrulama (algoritma kontrolü dahil) |
| `validateTaxId(id)` | Otomatik VKN/TCKN tespiti ve doğrulama |
| `validateDate(date)` | YYYY-MM-DD format kontrolü |
| `validateCurrency(code)` | ISO 4217 para birimi kontrolü |
| `validateEmail(email)` | E-posta format kontrolü |
| `validateIBAN(iban)` | Türkiye IBAN doğrulama (algoritma kontrolü dahil) |
| `validatePositiveNumber(n)` | Pozitif sayı kontrolü |

## E-Fatura Gönderme (Manuel)

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

## İndirim ve Tevkifat

```typescript
import { createInvoice, WITHHOLDING_CODES } from '@entegre/ets-sdk';

// Satır indirimi
const invoice = createInvoice()
  .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
  .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
  .addLine({
    itemCode: '001',
    itemName: 'Ürün',
    quantity: 10,
    price: 100,
    vatRate: 20,
    discountRate: 10  // %10 satır indirimi
  })
  .build();

// Genel indirim
const invoiceWithDiscount = createInvoice()
  .withDiscountAmount(500, 'Kampanya indirimi')  // 500 TL indirim
  // veya
  .withDiscountRate(5, 'Yıl sonu indirimi')  // %5 genel indirim
  .build();

// Tevkifatlı fatura
const withholdingInvoice = createInvoice()
  .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
  .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
  .withWithholding(90, '603', 'Güvenlik Hizmetleri')  // 9/10 tevkifat
  .addLine({
    itemCode: '001',
    itemName: 'Güvenlik Hizmeti',
    quantity: 1,
    price: 10000,
    vatRate: 20
  })
  .build();

// Hesaplanan toplamlar:
// - Satır toplamı: 10000 TRY
// - KDV: 2000 TRY
// - Tevkifat: 1800 TRY (KDV'nin %90'ı)
// - Ödenecek: 10200 TRY (12000 - 1800)

// Hazır tevkifat kodları
const codes = WITHHOLDING_CODES.GUVENLIK;  // { code: '603', reason: 'Güvenlik Hizmetleri', rate: 90 }
```

## Şablonlar (Templates)

```typescript
import {
  salesInvoiceTemplate,
  returnInvoiceTemplate,
  withholdingInvoiceTemplate,
  exportInvoiceTemplate,
  EXEMPTION_CODES,
  WITHHOLDING_CODES
} from '@entegre/ets-sdk';

// Satış faturası şablonu
const salesInvoice = salesInvoiceTemplate(
  { taxId: '1234567890', name: 'Satıcı' },
  { taxId: '9876543210', name: 'Alıcı' },
  [{ itemCode: '001', itemName: 'Ürün', quantity: 1, price: 100 }],
  { date: '2024-01-15', currency: 'TRY' }
);

// İade faturası
const returnInvoice = returnInvoiceTemplate(
  supplier, customer, lines,
  'ABC2024000000001',  // İade edilen fatura no
  { date: '2024-01-20' }
);

// Tevkifatlı fatura
const withholding = withholdingInvoiceTemplate(
  supplier, customer, lines,
  { withholdingRate: WITHHOLDING_CODES.TEMIZLIK.rate }  // 9/10
);

// İhracat faturası
const exportInv = exportInvoiceTemplate(
  supplier, customer, lines,
  { currency: 'USD', deliveryTerms: 'FOB' }
);
```

## XML Parser

```typescript
import { parseInvoiceXml, parseBase64InvoiceXml, toInvoice } from '@entegre/ets-sdk';

// XML string'den parse
const parsed = parseInvoiceXml(xmlString);
console.log('UUID:', parsed.uuid);
console.log('Fatura No:', parsed.invoiceNumber);
console.log('Satıcı:', parsed.supplier?.PartyName);
console.log('Toplam:', parsed.totals?.PayableAmount);

// Base64 encoded XML
const parsedFromBase64 = parseBase64InvoiceXml(base64Content);

// Invoice tipine dönüştürme
const invoice = toInvoice(parsed);
```

## Retry Mekanizması

```typescript
import { withRetry } from '@entegre/ets-sdk';

// Otomatik yeniden deneme
const result = await withRetry(
  () => client.sendInvoice(request),
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`Deneme ${attempt}, ${delay}ms sonra tekrar...`);
    }
  }
);
```

## Rate Limiting

```typescript
import { RateLimiter, createRateLimiter, RATE_LIMIT_PRESETS } from '@entegre/ets-sdk';

// Preset kullanarak
const limiter = createRateLimiter('STANDARD');  // 60 istek/dakika

// Özel konfigürasyon
const customLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,  // 1 dakika
  strategy: 'wait'  // 'throw' veya 'wait'
});

// Kullanım
await limiter.acquire();  // Rate limit bekle
const result = await client.sendInvoice(request);

// Veya
const result = await limiter.execute(() => client.sendInvoice(request));
```

## Caching

```typescript
import { userCache, exchangeRateCache, MemoryCache } from '@entegre/ets-sdk';

// Mükellef cache'i (30 dakika varsayılan)
userCache.cacheUser('1234567890', true, ['alias1', 'alias2']);
const user = userCache.getUser('1234567890');

// Döviz kuru cache'i (1 saat varsayılan)
exchangeRateCache.cacheRate('USD', '2024-01-15', 30.5);
const rate = exchangeRateCache.getRate('USD', '2024-01-15');

// Özel cache
const myCache = new MemoryCache<MyData>({
  defaultTtl: 5 * 60 * 1000,  // 5 dakika
  maxSize: 1000,
  namespace: 'my-cache'
});

myCache.set('key', data);
const cached = myCache.get('key');

// Lazy loading
const data = await myCache.getOrSet('key', async () => {
  return await fetchData();
});
```

## Logging / Debug

```typescript
import { setDebugMode, createLogger, LogLevel, logger } from '@entegre/ets-sdk';

// Debug modunu aç
setDebugMode(true);

// Global logger kullan
logger.debug('Debug mesajı', { extra: 'data' });
logger.info('Bilgi mesajı');
logger.warn('Uyarı');
logger.error('Hata', { error: err });

// Özel logger oluştur
const myLogger = createLogger('MyModule', {
  level: LogLevel.DEBUG,
  maskSensitiveData: true
});

myLogger.info('İşlem başladı');
myLogger.debug('Request', { password: 'secret' });  // password maskelenir

// HTTP logger
import { HttpLogger } from '@entegre/ets-sdk';

const httpLogger = new HttpLogger();
httpLogger.request('POST', '/api/invoice', { data });
httpLogger.response('POST', '/api/invoice', 200, 150, { result });
```

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
