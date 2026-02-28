# Web Uygulama Entegrasyon Rehberi

Bu rehber, @entegre/ets-sdk'yı web uygulamanıza entegre etmeniz için adım adım talimatlar içerir.

## İçindekiler

1. [Kurulum ve Yapılandırma](#kurulum-ve-yapılandırma)
2. [Temel Akış](#temel-akış)
3. [Veritabanı Şeması](#veritabanı-şeması)
4. [API Endpoints](#api-endpoints)
5. [Frontend Entegrasyonu](#frontend-entegrasyonu)
6. [Webhook Entegrasyonu](#webhook-entegrasyonu)
7. [Hata Yönetimi](#hata-yönetimi)
8. [Güvenlik](#güvenlik)
9. [Production Checklist](#production-checklist)

---

## Kurulum ve Yapılandırma

### 1. Paket Kurulumu

```bash
npm install @entegre/ets-sdk
```

### 2. Environment Variables

```env
# .env
ETS_BASE_URL=https://ets.bulutix.com
ETS_INTEGRATOR=UYM
ETS_PARTY_ID=1234567890
ETS_USERNAME=kullanici
ETS_PASSWORD=sifre
ETS_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Client Singleton

```typescript
// lib/ets-client.ts
import { EtsClient } from '@entegre/ets-sdk';

let client: EtsClient | null = null;
let tokenExpiry: number = 0;

export async function getEtsClient(): Promise<EtsClient> {
  // Token süresi dolmuşsa yeniden authenticate
  if (!client || Date.now() > tokenExpiry) {
    client = new EtsClient({
      baseUrl: process.env.ETS_BASE_URL,
      integrator: process.env.ETS_INTEGRATOR as 'UYM',
    });

    await client.authenticate({
      partyId: process.env.ETS_PARTY_ID!,
      username: process.env.ETS_USERNAME!,
      password: process.env.ETS_PASSWORD!,
    });

    // Token'ı 23 saat geçerli say (güvenli margin)
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  }

  return client;
}
```

---

## Temel Akış

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Kullanıcı │────▶│  Web App    │────▶│  ETS SDK    │────▶│  ETS API    │
│   (Browser) │     │  (Backend)  │     │             │     │  (GİB)      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │  1. Fatura        │                   │                   │
      │     Formu         │                   │                   │
      │──────────────────▶│                   │                   │
      │                   │  2. Doğrulama     │                   │
      │                   │     & Kaydet      │                   │
      │                   │──────────────────▶│                   │
      │                   │                   │  3. Gönder        │
      │                   │                   │──────────────────▶│
      │                   │                   │                   │
      │                   │                   │  4. UUID          │
      │                   │                   │◀──────────────────│
      │                   │  5. UUID & Status │                   │
      │                   │◀──────────────────│                   │
      │  6. Sonuç         │                   │                   │
      │◀──────────────────│                   │                   │
      │                   │                   │                   │
      │                   │                   │  7. Webhook       │
      │                   │◀──────────────────────────────────────│
      │                   │  (Status Update)  │                   │
      │  8. Bildirim      │                   │                   │
      │◀──────────────────│                   │                   │
```

---

## Veritabanı Şeması

### PostgreSQL / Prisma

```prisma
// schema.prisma

model Company {
  id           String    @id @default(uuid())
  taxId        String    @unique  // VKN
  name         String
  taxOffice    String?
  city         String?
  address      String?
  etsUsername  String?
  etsPassword  String?   // Encrypted
  createdAt    DateTime  @default(now())
  invoices     Invoice[]
}

model Customer {
  id           String    @id @default(uuid())
  taxId        String    // VKN veya TCKN
  name         String
  taxOffice    String?
  city         String?
  address      String?
  email        String?
  isEInvoice   Boolean   @default(false)
  alias        String?
  lastChecked  DateTime?
  createdAt    DateTime  @default(now())
  invoices     Invoice[]
}

model Invoice {
  id              String    @id @default(uuid())
  companyId       String
  customerId      String
  uuid            String?   @unique  // ETS UUID
  invoiceNumber   String?
  type            String    // SATIS, IADE, TEVKIFAT
  profile         String    // TEMELFATURA, TICARIFATURA
  documentType    String    // EFATURA, EARSIV
  issueDate       DateTime
  currency        String    @default("TRY")
  lineTotal       Decimal   @db.Decimal(18, 2)
  taxTotal        Decimal   @db.Decimal(18, 2)
  discountTotal   Decimal   @default(0) @db.Decimal(18, 2)
  grandTotal      Decimal   @db.Decimal(18, 2)
  payableAmount   Decimal   @db.Decimal(18, 2)
  status          String    @default("DRAFT")  // DRAFT, SENDING, SENT, DELIVERED, ACCEPTED, REJECTED, FAILED
  errorMessage    String?
  pdfUrl          String?
  rawRequest      Json?     // Gönderilen request
  rawResponse     Json?     // API response
  sentAt          DateTime?
  deliveredAt     DateTime?
  respondedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company         Company   @relation(fields: [companyId], references: [id])
  customer        Customer  @relation(fields: [customerId], references: [id])
  lines           InvoiceLine[]
  events          InvoiceEvent[]

  @@index([companyId])
  @@index([customerId])
  @@index([uuid])
  @@index([status])
}

model InvoiceLine {
  id              String    @id @default(uuid())
  invoiceId       String
  itemCode        String
  itemName        String
  description     String?
  quantity        Decimal   @db.Decimal(18, 4)
  unitCode        String    @default("C62")
  unitPrice       Decimal   @db.Decimal(18, 4)
  discountRate    Decimal?  @db.Decimal(5, 2)
  discountAmount  Decimal?  @db.Decimal(18, 2)
  lineAmount      Decimal   @db.Decimal(18, 2)
  taxRate         Decimal   @db.Decimal(5, 2)
  taxAmount       Decimal   @db.Decimal(18, 2)
  createdAt       DateTime  @default(now())

  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
}

model InvoiceEvent {
  id              String    @id @default(uuid())
  invoiceId       String
  event           String    // CREATED, SENT, DELIVERED, ACCEPTED, REJECTED
  status          String
  message         String?
  payload         Json?
  createdAt       DateTime  @default(now())

  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
}
```

---

## API Endpoints

### Express.js / Node.js

```typescript
// routes/invoices.ts
import { Router } from 'express';
import { getEtsClient } from '../lib/ets-client';
import { createInvoice, validateTaxId } from '@entegre/ets-sdk';
import { prisma } from '../lib/prisma';

const router = Router();

// Mükellef kontrolü
router.get('/check-customer/:taxId', async (req, res) => {
  const { taxId } = req.params;

  // Doğrulama
  const validation = validateTaxId(taxId);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors });
  }

  try {
    const client = await getEtsClient();
    const result = await client.checkEInvoiceUser(taxId);

    // Müşteri kaydını güncelle
    await prisma.customer.upsert({
      where: { taxId },
      update: {
        isEInvoice: result.data?.isActive ?? false,
        lastChecked: new Date(),
      },
      create: {
        taxId,
        name: '',
        isEInvoice: result.data?.isActive ?? false,
        lastChecked: new Date(),
      },
    });

    res.json({
      taxId,
      isEInvoice: result.data?.isActive,
      documentType: result.data?.isActive ? 'EFATURA' : 'EARSIV',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Fatura oluştur (taslak)
router.post('/invoices', async (req, res) => {
  const { customerId, lines, notes } = req.body;

  try {
    // Müşteri bilgilerini al
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }

    // Şirket bilgilerini al
    const company = await prisma.company.findFirst();

    // Toplamları hesapla
    let lineTotal = 0;
    let taxTotal = 0;

    const invoiceLines = lines.map((line: any) => {
      const lineAmount = line.quantity * line.unitPrice;
      const discountAmount = line.discountRate
        ? lineAmount * (line.discountRate / 100)
        : 0;
      const taxableAmount = lineAmount - discountAmount;
      const taxAmount = taxableAmount * (line.taxRate / 100);

      lineTotal += taxableAmount;
      taxTotal += taxAmount;

      return {
        itemCode: line.itemCode,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity,
        unitCode: line.unitCode || 'C62',
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        discountAmount,
        lineAmount: taxableAmount,
        taxRate: line.taxRate,
        taxAmount,
      };
    });

    const grandTotal = lineTotal + taxTotal;

    // Veritabanına kaydet
    const invoice = await prisma.invoice.create({
      data: {
        companyId: company!.id,
        customerId,
        type: 'SATIS',
        profile: customer.isEInvoice ? 'TEMELFATURA' : 'EARSIVFATURA',
        documentType: customer.isEInvoice ? 'EFATURA' : 'EARSIV',
        issueDate: new Date(),
        lineTotal,
        taxTotal,
        grandTotal,
        payableAmount: grandTotal,
        status: 'DRAFT',
        lines: {
          create: invoiceLines,
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    });

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Fatura gönder
router.post('/invoices/:id/send', async (req, res) => {
  const { id } = req.params;

  try {
    // Faturayı al
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        lines: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Fatura bulunamadı' });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Bu fatura zaten gönderilmiş' });
    }

    // ETS request oluştur
    const etsInvoice = createInvoice()
      .withType(invoice.type)
      .withProfile(invoice.profile)
      .withDate(invoice.issueDate.toISOString().split('T')[0])
      .withSupplier({
        taxId: invoice.company.taxId,
        name: invoice.company.name,
        taxOffice: invoice.company.taxOffice || undefined,
        city: invoice.company.city || undefined,
      })
      .withCustomer({
        taxId: invoice.customer.taxId,
        name: invoice.customer.name,
        taxOffice: invoice.customer.taxOffice || undefined,
        city: invoice.customer.city || undefined,
        alias: invoice.customer.alias || undefined,
      });

    // Satırları ekle
    for (const line of invoice.lines) {
      etsInvoice.addLine({
        itemCode: line.itemCode,
        itemName: line.itemName,
        description: line.description || undefined,
        quantity: Number(line.quantity),
        unitCode: line.unitCode,
        price: Number(line.unitPrice),
        vatRate: Number(line.taxRate),
        discountRate: line.discountRate ? Number(line.discountRate) : undefined,
      });
    }

    // Durumu güncelle
    await prisma.invoice.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    // Gönder
    const client = await getEtsClient();
    let result;

    if (invoice.documentType === 'EARSIV') {
      result = await client.sendEArchiveInvoice(
        etsInvoice.buildAsArchive('ELEKTRONIK', false)
      );
    } else {
      result = await client.sendInvoice(etsInvoice.build());
    }

    // Sonucu kaydet
    await prisma.invoice.update({
      where: { id },
      data: {
        uuid: result.data?.uuid,
        invoiceNumber: result.data?.invoiceNumber,
        status: 'SENT',
        sentAt: new Date(),
        rawResponse: result as any,
      },
    });

    // Event kaydet
    await prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        event: 'SENT',
        status: 'SENT',
        payload: result as any,
      },
    });

    res.json({
      success: true,
      uuid: result.data?.uuid,
      invoiceNumber: result.data?.invoiceNumber,
    });
  } catch (error) {
    // Hata durumunda güncelle
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
      },
    });

    await prisma.invoiceEvent.create({
      data: {
        invoiceId: id,
        event: 'FAILED',
        status: 'FAILED',
        message: (error as Error).message,
      },
    });

    res.status(500).json({ error: (error as Error).message });
  }
});

// Fatura durumu
router.get('/invoices/:id/status', async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || !invoice.uuid) {
      return res.status(404).json({ error: 'Fatura bulunamadı' });
    }

    const client = await getEtsClient();
    const result = await client.getInvoiceStatus(invoice.uuid);

    // Durumu güncelle
    if (result.data?.status && result.data.status !== invoice.status) {
      await prisma.invoice.update({
        where: { id },
        data: { status: result.data.status },
      });
    }

    res.json({
      uuid: invoice.uuid,
      invoiceNumber: invoice.invoiceNumber,
      status: result.data?.status,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PDF indir
router.get('/invoices/:id/pdf', async (req, res) => {
  const { id } = req.params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || !invoice.uuid) {
      return res.status(404).json({ error: 'Fatura bulunamadı' });
    }

    const client = await getEtsClient();
    const result = await client.getInvoicePdf(invoice.uuid);

    if (result.data?.pdfContent) {
      const buffer = Buffer.from(result.data.pdfContent, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${invoice.invoiceNumber}.pdf"`
      );
      res.send(buffer);
    } else {
      res.status(404).json({ error: 'PDF bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
```

---

## Frontend Entegrasyonu

### React Component

```tsx
// components/InvoiceForm.tsx
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

interface InvoiceFormData {
  customerId: string;
  lines: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];
}

export function InvoiceForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { register, control, handleSubmit, watch } = useForm<InvoiceFormData>({
    defaultValues: {
      lines: [{ itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxRate: 20 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const lines = watch('lines');

  // Toplam hesaplama
  const totals = lines.reduce(
    (acc, line) => {
      const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);
      const taxAmount = lineTotal * ((line.taxRate || 0) / 100);
      return {
        lineTotal: acc.lineTotal + lineTotal,
        taxTotal: acc.taxTotal + taxAmount,
        grandTotal: acc.grandTotal + lineTotal + taxAmount,
      };
    },
    { lineTotal: 0, taxTotal: 0, grandTotal: 0 }
  );

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      // 1. Fatura oluştur
      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const invoice = await createRes.json();

      // 2. Fatura gönder
      const sendRes = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      });
      const sendResult = await sendRes.json();

      setResult(sendResult);
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Müşteri Seçimi */}
      <div>
        <label>Müşteri</label>
        <CustomerSelect {...register('customerId', { required: true })} />
      </div>

      {/* Satırlar */}
      <div className="space-y-4">
        <h3>Ürünler</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-6 gap-2">
            <input
              {...register(`lines.${index}.itemCode`)}
              placeholder="Ürün Kodu"
            />
            <input
              {...register(`lines.${index}.itemName`)}
              placeholder="Ürün Adı"
              className="col-span-2"
            />
            <input
              type="number"
              {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
              placeholder="Miktar"
            />
            <input
              type="number"
              {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
              placeholder="Fiyat"
            />
            <div className="flex items-center gap-2">
              <select {...register(`lines.${index}.taxRate`, { valueAsNumber: true })}>
                <option value={20}>%20</option>
                <option value={10}>%10</option>
                <option value={1}>%1</option>
                <option value={0}>%0</option>
              </select>
              <button type="button" onClick={() => remove(index)}>×</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxRate: 20 })}
        >
          + Satır Ekle
        </button>
      </div>

      {/* Toplamlar */}
      <div className="bg-gray-100 p-4 rounded">
        <div className="flex justify-between">
          <span>Ara Toplam:</span>
          <span>{totals.lineTotal.toFixed(2)} TL</span>
        </div>
        <div className="flex justify-between">
          <span>KDV:</span>
          <span>{totals.taxTotal.toFixed(2)} TL</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Genel Toplam:</span>
          <span>{totals.grandTotal.toFixed(2)} TL</span>
        </div>
      </div>

      {/* Gönder */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? 'Gönderiliyor...' : 'Fatura Gönder'}
      </button>

      {/* Sonuç */}
      {result && (
        <div className={`p-4 rounded ${result.error ? 'bg-red-100' : 'bg-green-100'}`}>
          {result.error ? (
            <p className="text-red-700">{result.error}</p>
          ) : (
            <div>
              <p className="text-green-700">Fatura başarıyla gönderildi!</p>
              <p>UUID: {result.uuid}</p>
              <p>Fatura No: {result.invoiceNumber}</p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

---

## Webhook Entegrasyonu

### Webhook Handler

```typescript
// routes/webhook.ts
import { Router } from 'express';
import { createWebhookRouter } from '@entegre/ets-sdk';
import { prisma } from '../lib/prisma';
import { sendNotification } from '../lib/notification';

const router = Router();

const webhookRouter = createWebhookRouter({
  secret: process.env.ETS_WEBHOOK_SECRET,
  timestampTolerance: 5 * 60 * 1000, // 5 dakika
});

// Tüm event'leri logla
webhookRouter.on('*', async (payload) => {
  console.log('Webhook:', payload.event, payload.documentUuid);
});

// Fatura gönderildi
webhookRouter.on('invoice.sent', async (payload) => {
  await prisma.invoice.update({
    where: { uuid: payload.documentUuid },
    data: { status: 'SENT', sentAt: new Date() },
  });

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: (await prisma.invoice.findUnique({ where: { uuid: payload.documentUuid } }))!.id,
      event: 'SENT',
      status: 'SENT',
      payload: payload as any,
    },
  });
});

// Fatura iletildi
webhookRouter.on('invoice.delivered', async (payload) => {
  await prisma.invoice.update({
    where: { uuid: payload.documentUuid },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
});

// Fatura kabul edildi
webhookRouter.on('invoice.accepted', async (payload) => {
  const invoice = await prisma.invoice.update({
    where: { uuid: payload.documentUuid },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
    include: { customer: true },
  });

  await sendNotification({
    type: 'invoice.accepted',
    title: 'Fatura Kabul Edildi',
    message: `${invoice.invoiceNumber} numaralı fatura ${invoice.customer.name} tarafından kabul edildi.`,
  });
});

// Fatura reddedildi
webhookRouter.on('invoice.rejected', async (payload) => {
  const invoice = await prisma.invoice.update({
    where: { uuid: payload.documentUuid },
    data: {
      status: 'REJECTED',
      respondedAt: new Date(),
      errorMessage: payload.errorMessage,
    },
    include: { customer: true },
  });

  await sendNotification({
    type: 'invoice.rejected',
    title: 'Fatura Reddedildi',
    message: `${invoice.invoiceNumber} numaralı fatura reddedildi: ${payload.errorMessage}`,
    priority: 'high',
  });
});

router.post('/webhook/ets', webhookRouter.middleware());

export default router;
```

---

## Hata Yönetimi

### Global Error Handler

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import {
  EtsError,
  AuthenticationError,
  ValidationError,
  GibError,
} from '@entegre/ets-sdk';

export function etsErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('ETS Error:', error);

  if (error instanceof AuthenticationError) {
    return res.status(401).json({
      code: 'AUTH_ERROR',
      message: 'Kimlik doğrulama hatası',
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: error.message,
      fields: error.fields,
    });
  }

  if (error instanceof GibError) {
    return res.status(400).json({
      code: 'GIB_ERROR',
      gibCode: error.gibCode,
      message: error.message,
    });
  }

  if (error instanceof EtsError) {
    return res.status(error.statusCode || 500).json({
      code: 'ETS_ERROR',
      message: error.message,
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Beklenmeyen bir hata oluştu',
  });
}
```

---

## Güvenlik

### Token Şifreleme

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY!; // 32 byte

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const etsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // 30 istek
  message: { error: 'Çok fazla istek, lütfen bekleyin' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Production Checklist

### Deployment Öncesi

- [ ] Environment variables ayarlandı
- [ ] Token şifreleme aktif
- [ ] Rate limiting aktif
- [ ] Error logging yapılandırıldı
- [ ] Webhook endpoint'i SSL/TLS ile korunuyor
- [ ] Database backup planı hazır
- [ ] Monitoring ve alerting kuruldu

### Test Edilecekler

- [ ] Kimlik doğrulama
- [ ] Mükellef kontrolü
- [ ] E-Fatura gönderimi
- [ ] E-Arşiv gönderimi
- [ ] Durum sorgulama
- [ ] PDF indirme
- [ ] Webhook alımı
- [ ] Hata senaryoları

### Monitoring

```typescript
// lib/metrics.ts
import { createInvoice } from '@entegre/ets-sdk';

export const metrics = {
  invoicesSent: 0,
  invoicesAccepted: 0,
  invoicesRejected: 0,
  errors: 0,
  avgResponseTime: 0,
};

export function trackInvoice(status: string) {
  metrics.invoicesSent++;
  if (status === 'ACCEPTED') metrics.invoicesAccepted++;
  if (status === 'REJECTED') metrics.invoicesRejected++;
}

export function trackError() {
  metrics.errors++;
}
```

---

## Destek

Sorularınız için:
- GitHub Issues: https://github.com/Entegre/entegre-ets-sdk/issues
- Email: destek@entegre.com
