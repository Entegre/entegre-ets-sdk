# @entegre/ets-sdk

[![npm version](https://img.shields.io/npm/v/@entegre/ets-sdk.svg)](https://www.npmjs.com/package/@entegre/ets-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Entegre ETS API için TypeScript/JavaScript SDK. E-Fatura, E-Arşiv, E-İrsaliye ve E-Müstahsil işlemlerini kolayca yapmanızı sağlar.

## Özellikler

- 🚀 **Kolay Entegrasyon** - Builder pattern ile hızlı fatura oluşturma
- 📦 **TypeScript Desteği** - Tam tip güvenliği
- 🔄 **Otomatik Hesaplama** - KDV, tevkifat, indirim otomatik
- 🛡️ **Doğrulama** - VKN/TCKN/IBAN algoritma kontrolü
- ⚡ **Batch İşlemler** - Toplu fatura gönderimi
- 🔌 **Webhook** - Status değişikliği bildirimleri
- 🧪 **Test Araçları** - Mock client ve fixtures
- 💻 **CLI** - Komut satırı aracı

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
import { EtsClient, createInvoice } from '@entegre/ets-sdk';

// 1. Client oluştur
const client = new EtsClient({
  baseUrl: 'https://ets.bulutix.com',
  integrator: 'UYM'
});

// 2. Kimlik doğrula
await client.authenticate({
  partyId: '1234567890',
  username: 'kullanici',
  password: 'sifre'
});

// 3. Fatura oluştur (Builder ile)
const invoice = createInvoice()
  .withType('SATIS')
  .withSupplier({
    taxId: '1234567890',
    name: 'Satıcı Firma A.Ş.',
    taxOffice: 'Kadıköy VD',
    city: 'İstanbul'
  })
  .withCustomer({
    taxId: '9876543210',
    name: 'Alıcı Firma Ltd.',
    taxOffice: 'Çankaya VD'
  })
  .addLine({
    itemCode: 'URUN-001',
    itemName: 'Yazılım Lisansı',
    quantity: 1,
    price: 1000,
    vatRate: 20
  })
  .build();

// 4. Gönder
const result = await client.sendInvoice(invoice);
console.log('UUID:', result.data?.uuid);
```

---

# 📚 Entegrasyon Rehberi

## İçindekiler

1. [Temel Kavramlar](#temel-kavramlar)
2. [Kimlik Doğrulama](#kimlik-doğrulama)
3. [E-Fatura İşlemleri](#e-fatura-i̇şlemleri)
4. [E-Arşiv İşlemleri](#e-arşiv-i̇şlemleri)
5. [E-İrsaliye İşlemleri](#e-i̇rsaliye-i̇şlemleri)
6. [İndirim ve Tevkifat](#i̇ndirim-ve-tevkifat)
7. [Doğrulama](#doğrulama)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Webhook Entegrasyonu](#webhook-entegrasyonu)
10. [Toplu İşlemler](#toplu-i̇şlemler)
11. [Test ve Mock](#test-ve-mock)
12. [CLI Kullanımı](#cli-kullanımı)
13. [Framework Entegrasyonları](#framework-entegrasyonları)

---

## Temel Kavramlar

### Entegratörler

| Kod | Entegratör |
|-----|------------|
| `UYM` | Uyumsoft |
| `UYK` | Uyumsoft Kurumsal |
| `IZI` | İzibiz |
| `DGN` | Doğan E-Dönüşüm |
| `MYS` | Mysoft |

### Fatura Tipleri

| Tip | Açıklama |
|-----|----------|
| `SATIS` | Satış faturası |
| `IADE` | İade faturası |
| `TEVKIFAT` | Tevkifatlı fatura |
| `ISTISNA` | İstisna faturası |
| `OZELMATRAH` | Özel matrah faturası |
| `IHRACKAYITLI` | İhraç kayıtlı fatura |

### Fatura Profilleri

| Profil | Açıklama |
|--------|----------|
| `TEMELFATURA` | Temel fatura (otomatik kabul) |
| `TICARIFATURA` | Ticari fatura (kabul/red mekanizmalı) |
| `IHRACAT` | İhracat faturası |
| `EARSIVFATURA` | E-Arşiv faturası |

---

## Kimlik Doğrulama

```typescript
import { EtsClient } from '@entegre/ets-sdk';

const client = new EtsClient({
  baseUrl: 'https://ets.bulutix.com',  // Varsayılan
  integrator: 'UYM',                    // Entegratör kodu
  softwareId: 'MY-APP',                 // Opsiyonel
  timeout: 30000                        // Opsiyonel (ms)
});

// Kimlik doğrulama
const authResult = await client.authenticate({
  partyId: '1234567890',   // VKN
  username: 'kullanici',
  password: 'sifre'
});

if (authResult.success) {
  console.log('Token:', authResult.data?.token);
}

// Token'ı manuel ayarlama (önceden alınmış token için)
client.setToken('existing-token');

// Token kontrolü
if (client.isAuthenticated()) {
  // İşlemlere devam et
}
```

### Token Yönetimi (Web App)

```typescript
// Token'ı session/localStorage'da sakla
const token = client.getToken();
localStorage.setItem('ets_token', token);

// Sayfa yenilendiğinde geri yükle
const savedToken = localStorage.getItem('ets_token');
if (savedToken) {
  client.setToken(savedToken);
}
```

---

## E-Fatura İşlemleri

### Mükellef Kontrolü

```typescript
// E-Fatura mükellefi mi?
const check = await client.checkEInvoiceUser('9876543210');
if (check.data?.isActive) {
  console.log('E-Fatura mükellefi');
} else {
  console.log('E-Fatura mükellefi değil, E-Arşiv gönderilecek');
}

// Alias listesi
const aliases = await client.getUserAliases('9876543210');
console.log('Alias:', aliases.data?.receiverboxAliases[0]?.alias);
```

### Fatura Oluşturma (Builder Pattern)

```typescript
import { createInvoice, UNIT_CODES, TAX_CODES } from '@entegre/ets-sdk';

const invoice = createInvoice()
  // Temel bilgiler
  .withType('SATIS')
  .withProfile('TEMELFATURA')
  .withDate('2024-01-15')
  .withCurrency('TRY')

  // Satıcı
  .withSupplier({
    taxId: '1234567890',
    name: 'Satıcı Firma A.Ş.',
    taxOffice: 'Kadıköy VD',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Örnek Sokak No: 1'
  })

  // Alıcı
  .withCustomer({
    taxId: '9876543210',
    name: 'Alıcı Firma Ltd.',
    taxOffice: 'Çankaya VD',
    city: 'Ankara',
    alias: 'urn:mail:defaultpk@9876543210'
  })

  // Ürünler
  .addLine({
    itemCode: 'URUN-001',
    itemName: 'Yazılım Lisansı',
    quantity: 1,
    price: 1000,
    vatRate: 20,
    unitCode: UNIT_CODES.ADET  // 'C62'
  })
  .addLine({
    itemCode: 'URUN-002',
    itemName: 'Destek Paketi',
    quantity: 12,
    price: 100,
    vatRate: 20
  })

  // Notlar
  .withNote('Fatura notu')

  .build();

// Toplamlar otomatik hesaplanır:
// Satır toplamı: 2200 TRY
// KDV: 440 TRY
// Genel toplam: 2640 TRY
```

### Fatura Gönderme

```typescript
// Normal gönderim
const result = await client.sendInvoice(invoice);
console.log('UUID:', result.data?.uuid);
console.log('Fatura No:', result.data?.invoiceNumber);

// Taslak olarak gönderim
const draftResult = await client.sendDraftInvoice(invoice);
```

### Durum Sorgulama

```typescript
const status = await client.getInvoiceStatus(uuid);
console.log('Durum:', status.data?.status);
// SENT, DELIVERED, ACCEPTED, REJECTED, FAILED
```

### Ticari Fatura Yanıtı

```typescript
// Kabul
await client.respondInvoice(uuid, {
  response: 'KABUL',
  description: 'Fatura kabul edildi'
});

// Red
await client.respondInvoice(uuid, {
  response: 'RED',
  description: 'Fatura bilgileri hatalı'
});
```

### Gelen Faturalar

```typescript
const inbox = await client.getInboxInvoices({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  page: 1,
  pageSize: 20
});

inbox.data?.items.forEach(inv => {
  console.log(inv.invoiceNumber, inv.senderName, inv.payableAmount);
});
```

### PDF İndirme

```typescript
const pdf = await client.getInvoicePdf(uuid);
if (pdf.data?.pdfContent) {
  // Base64 decode ve kaydet
  const buffer = Buffer.from(pdf.data.pdfContent, 'base64');
  fs.writeFileSync('fatura.pdf', buffer);
}
```

---

## E-Arşiv İşlemleri

E-Fatura mükellefi olmayan alıcılar için kullanılır.

```typescript
// E-Arşiv faturası oluştur
const archiveInvoice = createInvoice()
  .withType('SATIS')
  .withProfile('EARSIVFATURA')
  .withSupplier({
    taxId: '1234567890',
    name: 'Satıcı Firma'
  })
  .withCustomer({
    taxId: '12345678901',  // TCKN
    name: 'Ahmet Yılmaz',
    firstName: 'Ahmet',
    lastName: 'Yılmaz'
  })
  .addLine({
    itemCode: '001',
    itemName: 'Ürün',
    quantity: 1,
    price: 100
  })
  .buildAsArchive('ELEKTRONIK', false);  // sendingType, isInternetSales

// Gönder
const result = await client.sendEArchiveInvoice(archiveInvoice);

// İptal
await client.cancelEArchive(uuid, '2024-01-16');
```

---

## E-İrsaliye İşlemleri

```typescript
import { createDispatch } from '@entegre/ets-sdk';

const dispatch = createDispatch()
  .withType('SEVK')
  .withDate('2024-01-15')
  .withSupplier({
    taxId: '1234567890',
    name: 'Gönderici Firma'
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
  .build();

const result = await client.sendDispatch(dispatch);
```

---

## İndirim ve Tevkifat

### Satır İndirimi

```typescript
const invoice = createInvoice()
  .addLine({
    itemCode: '001',
    itemName: 'Ürün',
    quantity: 10,
    price: 100,
    vatRate: 20,
    discountRate: 10  // %10 indirim
  })
  .build();

// Satır tutarı: 1000 TRY
// İndirim: 100 TRY
// İndirimli tutar: 900 TRY
// KDV: 180 TRY
```

### Genel İndirim

```typescript
const invoice = createInvoice()
  // ... satırlar
  .withDiscountAmount(500, 'Kampanya indirimi')  // 500 TL
  // veya
  .withDiscountRate(5, 'Yıl sonu indirimi')      // %5
  .build();
```

### Tevkifat

```typescript
import { WITHHOLDING_CODES } from '@entegre/ets-sdk';

const invoice = createInvoice()
  .withSupplier({ taxId: '1234567890', name: 'Satıcı' })
  .withCustomer({ taxId: '9876543210', name: 'Alıcı' })
  .withWithholding(
    WITHHOLDING_CODES.GUVENLIK.rate,  // 90 (9/10)
    WITHHOLDING_CODES.GUVENLIK.code,  // '603'
    WITHHOLDING_CODES.GUVENLIK.reason // 'Güvenlik Hizmetleri'
  )
  .addLine({
    itemCode: '001',
    itemName: 'Güvenlik Hizmeti',
    quantity: 1,
    price: 10000,
    vatRate: 20
  })
  .build();

// Satır toplamı: 10000 TRY
// KDV: 2000 TRY
// Tevkifat: 1800 TRY (KDV'nin %90'ı)
// Ödenecek: 10200 TRY
```

### Hazır Tevkifat Kodları

```typescript
WITHHOLDING_CODES.YAPIM_ISLERI   // 4/10
WITHHOLDING_CODES.TEMIZLIK       // 9/10
WITHHOLDING_CODES.GUVENLIK       // 9/10
WITHHOLDING_CODES.PERSONEL       // 9/10
WITHHOLDING_CODES.YEMEK          // 5/10
WITHHOLDING_CODES.MAKINE_KIRALAMA // 5/10
WITHHOLDING_CODES.ISGUCU         // 9/10
```

---

## Doğrulama

```typescript
import {
  validateVKN,
  validateTCKN,
  validateTaxId,
  validateIBAN,
  Validator
} from '@entegre/ets-sdk';

// Tek doğrulama
const vknResult = validateVKN('1234567890');
if (!vknResult.valid) {
  console.error('VKN hatası:', vknResult.errors);
}

// TCKN
const tcknResult = validateTCKN('12345678901');

// Otomatik (10 hane VKN, 11 hane TCKN)
const taxIdResult = validateTaxId('1234567890');

// IBAN
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
  result.errors.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}

// Exception fırlat
Validator.create()
  .taxId(customerTaxId)
  .date(issueDate)
  .throwIfInvalid();  // Hata varsa Error fırlatır
```

---

## Hata Yönetimi

```typescript
import {
  EtsError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  GibError,
  GIB_ERROR_CODES
} from '@entegre/ets-sdk';

try {
  await client.sendInvoice(invoice);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Token geçersiz veya süresi dolmuş
    console.error('Kimlik doğrulama hatası - yeniden giriş yapın');

  } else if (error instanceof AuthorizationError) {
    // Yetkisiz işlem
    console.error('Bu işlem için yetkiniz yok');

  } else if (error instanceof ValidationError) {
    // Doğrulama hatası
    console.error('Doğrulama hatası:', error.fields);

  } else if (error instanceof GibError) {
    // GİB'den gelen hata
    console.error('GİB hatası:', error.gibCode, error.message);

    // Bilinen hata kodları
    if (error.gibCode === '11603') {
      console.error('Fatura numarası daha önce kullanılmış');
    }

  } else if (error instanceof EtsError) {
    // Genel API hatası
    console.error('API hatası:', error.message);
    console.error('HTTP kodu:', error.statusCode);
  }
}
```

### Retry Mekanizması

```typescript
import { withRetry } from '@entegre/ets-sdk';

const result = await withRetry(
  () => client.sendInvoice(invoice),
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

---

## Webhook Entegrasyonu

Fatura durumu değişikliklerini almak için webhook kullanın.

### Express.js ile

```typescript
import express from 'express';
import { createWebhookRouter } from '@entegre/ets-sdk';

const app = express();
app.use(express.json());

const webhookRouter = createWebhookRouter({
  secret: process.env.WEBHOOK_SECRET,  // Signature doğrulama
  timestampTolerance: 5 * 60 * 1000    // 5 dakika
});

// Event handler'lar
webhookRouter.on('invoice.sent', async (payload) => {
  console.log('Fatura gönderildi:', payload.documentUuid);
  await db.updateInvoiceStatus(payload.documentUuid, 'SENT');
});

webhookRouter.on('invoice.delivered', async (payload) => {
  console.log('Fatura iletildi:', payload.documentUuid);
});

webhookRouter.on('invoice.accepted', async (payload) => {
  console.log('Fatura kabul edildi:', payload.documentUuid);
});

webhookRouter.on('invoice.rejected', async (payload) => {
  console.log('Fatura reddedildi:', payload.documentUuid);
  console.log('Sebep:', payload.errorMessage);
});

// Tüm fatura event'leri
webhookRouter.onInvoice(async (payload) => {
  await notificationService.send(
    `Fatura ${payload.documentNumber}: ${payload.event}`
  );
});

// Middleware olarak kullan
app.post('/webhook/ets', webhookRouter.middleware());

app.listen(3000);
```

### Next.js API Route ile

```typescript
// pages/api/webhook/ets.ts
import { createWebhookHandler } from '@entegre/ets-sdk';
import type { NextApiRequest, NextApiResponse } from 'next';

const handler = createWebhookHandler({
  'invoice.accepted': async (payload) => {
    await prisma.invoice.update({
      where: { uuid: payload.documentUuid },
      data: { status: 'ACCEPTED' }
    });
  },
  'invoice.rejected': async (payload) => {
    await prisma.invoice.update({
      where: { uuid: payload.documentUuid },
      data: { status: 'REJECTED', errorMessage: payload.errorMessage }
    });
  }
}, { secret: process.env.WEBHOOK_SECRET });

export default async function webhookHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await handler(req.body, req.headers as Record<string, string>);
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
```

### Event Tipleri

| Event | Açıklama |
|-------|----------|
| `invoice.created` | Fatura oluşturuldu |
| `invoice.sent` | Fatura gönderildi |
| `invoice.delivered` | Fatura iletildi |
| `invoice.accepted` | Fatura kabul edildi |
| `invoice.rejected` | Fatura reddedildi |
| `invoice.failed` | Fatura başarısız |
| `archive.created` | E-Arşiv oluşturuldu |
| `archive.sent` | E-Arşiv gönderildi |
| `archive.cancelled` | E-Arşiv iptal edildi |
| `dispatch.created` | İrsaliye oluşturuldu |
| `dispatch.sent` | İrsaliye gönderildi |
| `dispatch.delivered` | İrsaliye iletildi |

---

## Toplu İşlemler

### Batch Gönderim

```typescript
import { processBatch, BatchInvoiceSender } from '@entegre/ets-sdk';

// Fatura listesi
const invoices = [invoice1, invoice2, invoice3, ...];

// Generic processor
const results = await processBatch(
  invoices,
  async (invoice) => await client.sendInvoice(invoice),
  {
    concurrency: 5,           // Paralel işlem sayısı
    continueOnError: true,    // Hata olsa da devam et
    retries: 2,               // Başarısız olursa yeniden dene
    delayBetween: 100,        // İşlemler arası bekleme (ms)
    onProgress: (completed, total, result) => {
      const percent = Math.round((completed / total) * 100);
      console.log(`İlerleme: ${percent}% (${completed}/${total})`);

      if (!result.success) {
        console.error(`#${result.index} hata:`, result.error?.message);
      }
    }
  }
);

// Sonuç özeti
console.log(`Toplam: ${results.total}`);
console.log(`Başarılı: ${results.successful}`);
console.log(`Başarısız: ${results.failed}`);
console.log(`Süre: ${results.duration}ms`);

// Başarısız olanları listele
const failed = results.results.filter(r => !r.success);
failed.forEach(r => {
  console.error(`Fatura #${r.index}:`, r.error?.message);
});

// Başarılı UUID'leri al
const uuids = results.results
  .filter(r => r.success)
  .map(r => r.data?.uuid);
```

### Rate Limiting ile

```typescript
import { createRateLimiter, RATE_LIMIT_PRESETS } from '@entegre/ets-sdk';

const limiter = createRateLimiter(RATE_LIMIT_PRESETS.STANDARD);  // 60/dakika

for (const invoice of invoices) {
  await limiter.execute(async () => {
    await client.sendInvoice(invoice);
  });
}
```

---

## Test ve Mock

### Mock Client

```typescript
import { createMockClient, fixtures, generators } from '@entegre/ets-sdk';

// Test için mock client
const mockClient = createMockClient({
  delay: 100,      // API gecikme simülasyonu (ms)
  errorRate: 0.1   // %10 rastgele hata
});

// Test kullanıcısı ekle
mockClient.addTestUser('1234567890', true, ['urn:mail:test@test.com']);

// Normal client gibi kullan
await mockClient.authenticate({
  partyId: '1234567890',
  username: 'test',
  password: 'test'
});

const result = await mockClient.sendInvoice(invoice);
console.log('UUID:', result.data?.uuid);

// Fatura durumunu manuel değiştir (test için)
mockClient.setInvoiceStatus(uuid, 'ACCEPTED');
```

### Fixtures

```typescript
import { fixtures, generators } from '@entegre/ets-sdk';

// Hazır test verileri
const supplier = fixtures.supplier;
const customer = fixtures.customer;
const lines = fixtures.lines;

// Rastgele veri üretimi
const randomVkn = generators.randomVKN();        // '3847562910'
const randomTckn = generators.randomTCKN();      // '28374651029'
const randomDate = generators.randomRecentDate(); // '2024-01-10'
const randomAmount = generators.randomAmount(100, 10000); // 4523.50
```

### Vitest ile Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockClient, createInvoice, fixtures } from '@entegre/ets-sdk';

describe('Invoice', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient({ delay: 0 });
  });

  it('should send invoice successfully', async () => {
    await client.authenticate({
      partyId: '1234567890',
      username: 'test',
      password: 'test'
    });

    const invoice = createInvoice()
      .withSupplier(fixtures.supplier)
      .withCustomer(fixtures.customer)
      .addLines(fixtures.lines)
      .build();

    const result = await client.sendInvoice(invoice);

    expect(result.success).toBe(true);
    expect(result.data?.uuid).toBeDefined();
  });
});
```

---

## CLI Kullanımı

```bash
# Global kurulum
npm install -g @entegre/ets-sdk

# Konfigürasyon
ets-cli config --set baseUrl=https://ets.bulutix.com
ets-cli config --set integrator=UYM
ets-cli config --list

# Kimlik doğrulama
ets-cli auth --party-id 1234567890 --username user --password pass

# Mükellef kontrolü
ets-cli check-user 9876543210
ets-cli check-user 9876543210 --json

# Fatura gönderme
ets-cli send invoice.json
ets-cli send invoice.json --draft
ets-cli send invoice.json --archive

# Durum sorgulama
ets-cli status 12345678-1234-1234-1234-123456789012

# Fatura karşılaştırma
ets-cli diff invoice1.json invoice2.json
ets-cli diff invoice1.json invoice2.json --json

# Yardım
ets-cli --help
```

---

## Framework Entegrasyonları

### React / Next.js

```typescript
// hooks/useEtsClient.ts
import { useState, useCallback } from 'react';
import { EtsClient, createInvoice, type InvoiceRequest } from '@entegre/ets-sdk';

const client = new EtsClient({ integrator: 'UYM' });

export function useEtsClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authenticate = useCallback(async (credentials: {
    partyId: string;
    username: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.authenticate(credentials);
      if (result.data?.token) {
        localStorage.setItem('ets_token', result.data.token);
      }
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendInvoice = useCallback(async (invoice: InvoiceRequest) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('ets_token');
      if (token) client.setToken(token);
      return await client.sendInvoice(invoice);
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { authenticate, sendInvoice, loading, error, client };
}
```

```tsx
// components/InvoiceForm.tsx
import { useEtsClient } from '../hooks/useEtsClient';
import { createInvoice } from '@entegre/ets-sdk';

export function InvoiceForm() {
  const { sendInvoice, loading, error } = useEtsClient();

  const handleSubmit = async (formData: FormData) => {
    const invoice = createInvoice()
      .withSupplier({
        taxId: formData.get('supplierTaxId') as string,
        name: formData.get('supplierName') as string,
      })
      .withCustomer({
        taxId: formData.get('customerTaxId') as string,
        name: formData.get('customerName') as string,
      })
      .addLine({
        itemCode: formData.get('itemCode') as string,
        itemName: formData.get('itemName') as string,
        quantity: Number(formData.get('quantity')),
        price: Number(formData.get('price')),
      })
      .build();

    const result = await sendInvoice(invoice);
    alert(`Fatura gönderildi: ${result.data?.uuid}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Fatura Gönder'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
```

### Vue.js

```typescript
// composables/useEts.ts
import { ref } from 'vue';
import { EtsClient, createInvoice } from '@entegre/ets-sdk';

const client = new EtsClient({ integrator: 'UYM' });

export function useEts() {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function authenticate(partyId: string, username: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const result = await client.authenticate({ partyId, username, password });
      return result;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function sendInvoice(invoiceData: Parameters<typeof createInvoice>[0]) {
    loading.value = true;
    error.value = null;
    try {
      const invoice = createInvoice()
        .withSupplier(invoiceData.supplier)
        .withCustomer(invoiceData.customer)
        .addLines(invoiceData.lines)
        .build();
      return await client.sendInvoice(invoice);
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { authenticate, sendInvoice, loading, error };
}
```

### NestJS

```typescript
// ets.module.ts
import { Module, Global } from '@nestjs/common';
import { EtsService } from './ets.service';

@Global()
@Module({
  providers: [EtsService],
  exports: [EtsService],
})
export class EtsModule {}

// ets.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EtsClient, createInvoice, type InvoiceRequest } from '@entegre/ets-sdk';

@Injectable()
export class EtsService implements OnModuleInit {
  private client: EtsClient;

  constructor(private config: ConfigService) {
    this.client = new EtsClient({
      baseUrl: this.config.get('ETS_BASE_URL'),
      integrator: this.config.get('ETS_INTEGRATOR'),
    });
  }

  async onModuleInit() {
    await this.client.authenticate({
      partyId: this.config.get('ETS_PARTY_ID'),
      username: this.config.get('ETS_USERNAME'),
      password: this.config.get('ETS_PASSWORD'),
    });
  }

  async sendInvoice(request: InvoiceRequest) {
    return this.client.sendInvoice(request);
  }

  async checkUser(taxId: string) {
    return this.client.checkEInvoiceUser(taxId);
  }

  createInvoiceBuilder() {
    return createInvoice();
  }
}

// invoice.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { EtsService } from './ets.service';

@Controller('invoices')
export class InvoiceController {
  constructor(private ets: EtsService) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    const invoice = this.ets.createInvoiceBuilder()
      .withSupplier(dto.supplier)
      .withCustomer(dto.customer)
      .addLines(dto.lines)
      .build();

    return this.ets.sendInvoice(invoice);
  }
}
```

---

## Sabitler

```typescript
import {
  UNIT_CODES,
  TAX_CODES,
  INVOICE_TYPES,
  INVOICE_PROFILES,
  CURRENCIES,
  INTEGRATORS
} from '@entegre/ets-sdk';

// Birim kodları
UNIT_CODES.ADET       // 'C62'
UNIT_CODES.KILOGRAM   // 'KGM'
UNIT_CODES.LITRE      // 'LTR'
UNIT_CODES.METRE      // 'MTR'
UNIT_CODES.METREKARE  // 'MTK'
UNIT_CODES.SAAT       // 'HUR'
UNIT_CODES.GUN        // 'DAY'
UNIT_CODES.AY         // 'MON'

// Vergi kodları
TAX_CODES.KDV          // '0015'
TAX_CODES.KDV_TEVKIFAT // '9015'
TAX_CODES.OTV_I        // '0003'
TAX_CODES.STOPAJ       // '0003'

// Para birimleri
CURRENCIES.TRY  // 'TRY'
CURRENCIES.USD  // 'USD'
CURRENCIES.EUR  // 'EUR'
```

---

## Destek

- 📖 [API Dokümantasyonu](https://github.com/Entegre/entegre-ets-sdk)
- 🐛 [Hata Bildirimi](https://github.com/Entegre/entegre-ets-sdk/issues)
- 📧 destek@entegre.com

## Lisans

MIT
