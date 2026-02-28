import type {
  InvoiceRequest,
  InvoiceResult,
  InvoiceStatus,
  DispatchRequest,
  DispatchResult,
  ProducerReceiptRequest,
  ProducerReceiptResult,
  ArchiveInvoiceRequest,
  ArchiveInvoiceResult,
  UserCheckResult,
  UserAliasResult,
  ApiResponse,
} from '../types';

/**
 * Mock response konfigürasyonu
 */
export interface MockConfig {
  /** Gecikme (ms) - API latency simülasyonu */
  delay?: number;
  /** Hata oranı (0-1) - rastgele hata simülasyonu */
  errorRate?: number;
  /** Özel UUID generator */
  uuidGenerator?: () => string;
  /** Özel fatura numarası generator */
  invoiceNumberGenerator?: () => string;
}

/**
 * Basit UUID generator
 */
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fatura numarası generator
 */
function generateInvoiceNumber(prefix: string = 'TEST'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(9, '0');
  return `${prefix}${year}${random}`;
}

/**
 * Delay utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock ETS Client
 */
export class MockEtsClient {
  private config: Required<MockConfig>;
  private token: string | null = null;
  private invoices: Map<string, { request: InvoiceRequest; status: string }> = new Map();
  private archives: Map<string, { request: ArchiveInvoiceRequest; status: string }> = new Map();
  private dispatches: Map<string, { request: DispatchRequest; status: string }> = new Map();
  private users: Map<string, { isActive: boolean; aliases: string[] }> = new Map();

  constructor(config: MockConfig = {}) {
    this.config = {
      delay: config.delay ?? 100,
      errorRate: config.errorRate ?? 0,
      uuidGenerator: config.uuidGenerator ?? generateUuid,
      invoiceNumberGenerator: config.invoiceNumberGenerator ?? (() => generateInvoiceNumber()),
    };

    // Varsayılan test kullanıcıları
    this.users.set('1234567890', { isActive: true, aliases: ['urn:mail:defaultpk@1234567890'] });
    this.users.set('9876543210', { isActive: true, aliases: ['urn:mail:defaultpk@9876543210'] });
    this.users.set('1111111111', { isActive: false, aliases: [] });
  }

  /**
   * Gecikme ve hata simülasyonu
   */
  private async simulate(): Promise<void> {
    if (this.config.delay > 0) {
      await sleep(this.config.delay);
    }

    if (Math.random() < this.config.errorRate) {
      throw new Error('Simulated API error');
    }
  }

  /**
   * Response wrapper
   */
  private response<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      message: 'Success',
      data,
    };
  }

  // ==================== AUTH ====================

  async authenticate(credentials: { partyId: string; username: string; password: string }): Promise<ApiResponse<{ token: string }>> {
    await this.simulate();

    if (credentials.username === 'invalid') {
      throw new Error('Invalid credentials');
    }

    this.token = `mock-token-${Date.now()}`;
    return this.response({ token: this.token });
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // ==================== USER CHECK ====================

  async checkEInvoiceUser(partyId: string): Promise<ApiResponse<UserCheckResult>> {
    await this.simulate();

    const user = this.users.get(partyId);
    return this.response({
      partyId,
      isActive: user?.isActive ?? false,
    });
  }

  async getUserAliases(partyId: string): Promise<ApiResponse<UserAliasResult>> {
    await this.simulate();

    const user = this.users.get(partyId);
    return this.response({
      partyIdentificationId: partyId,
      title: `Test Company ${partyId}`,
      type: 'TZEL',
      senderboxAliases: user?.aliases.map((alias) => ({ alias })) ?? [],
      receiverboxAliases: user?.aliases.map((alias) => ({ alias })) ?? [],
    });
  }

  // ==================== E-INVOICE ====================

  async sendInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    await this.simulate();

    const uuid = this.config.uuidGenerator();
    const invoiceNumber = request.Invoice.InvoiceId || this.config.invoiceNumberGenerator();

    this.invoices.set(uuid, { request, status: 'SENT' });

    return this.response({
      uuid,
      invoiceNumber,
      status: 'SENT',
    });
  }

  async sendDraftInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    await this.simulate();

    const uuid = this.config.uuidGenerator();
    const invoiceNumber = request.Invoice.InvoiceId || this.config.invoiceNumberGenerator();

    this.invoices.set(uuid, { request, status: 'DRAFT' });

    return this.response({
      uuid,
      invoiceNumber,
      status: 'DRAFT',
    });
  }

  async getInvoiceStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    await this.simulate();

    const invoice = this.invoices.get(uuid);
    if (!invoice) {
      throw new Error(`Invoice not found: ${uuid}`);
    }

    return this.response({
      uuid,
      status: invoice.status,
      statusCode: invoice.status === 'SENT' ? 1 : 0,
    } as InvoiceStatus);
  }

  // ==================== E-ARCHIVE ====================

  async sendEArchiveInvoice(request: ArchiveInvoiceRequest): Promise<ApiResponse<ArchiveInvoiceResult>> {
    await this.simulate();

    const uuid = this.config.uuidGenerator();
    const invoiceNumber = request.Invoice.InvoiceId || this.config.invoiceNumberGenerator();

    this.archives.set(uuid, { request, status: 'SENT' });

    return this.response({
      uuid,
      invoiceNumber,
      status: 'SENT',
    });
  }

  // ==================== E-DISPATCH ====================

  async sendDispatch(request: DispatchRequest): Promise<ApiResponse<DispatchResult>> {
    await this.simulate();

    const uuid = this.config.uuidGenerator();
    const dispatchNumber = request.Dispatch.DispatchId || this.config.invoiceNumberGenerator();

    this.dispatches.set(uuid, { request, status: 'SENT' });

    return this.response({
      uuid,
      invoiceNumber: dispatchNumber,
      status: 'SENT',
    });
  }

  // ==================== E-PRODUCER RECEIPT ====================

  async sendProducerReceipt(request: ProducerReceiptRequest): Promise<ApiResponse<ProducerReceiptResult>> {
    await this.simulate();

    const uuid = this.config.uuidGenerator();
    const receiptNumber = request.ProducerReceipt.ReceiptId || this.config.invoiceNumberGenerator();

    return this.response({
      uuid,
      invoiceNumber: receiptNumber,
      status: 'SENT',
    });
  }

  // ==================== TEST HELPERS ====================

  /**
   * Test kullanıcısı ekler
   */
  addTestUser(partyId: string, isActive: boolean, aliases: string[] = []): void {
    this.users.set(partyId, { isActive, aliases });
  }

  /**
   * Fatura durumunu değiştirir
   */
  setInvoiceStatus(uuid: string, status: string): void {
    const invoice = this.invoices.get(uuid);
    if (invoice) {
      invoice.status = status;
    }
  }

  /**
   * Tüm verileri temizler
   */
  reset(): void {
    this.token = null;
    this.invoices.clear();
    this.archives.clear();
    this.dispatches.clear();
  }

  /**
   * Kaydedilen faturaları döner
   */
  getStoredInvoices(): Map<string, { request: InvoiceRequest; status: string }> {
    return this.invoices;
  }
}

/**
 * Mock client factory
 */
export function createMockClient(config?: MockConfig): MockEtsClient {
  return new MockEtsClient(config);
}

// ==================== FIXTURES ====================

/**
 * Test fixture'ları
 */
export const fixtures = {
  /** Test satıcı bilgisi */
  supplier: {
    taxId: '1234567890',
    name: 'Test Satıcı A.Ş.',
    taxOffice: 'Test VD',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Test Sokak No: 1',
  },

  /** Test alıcı bilgisi */
  customer: {
    taxId: '9876543210',
    name: 'Test Alıcı Ltd.',
    taxOffice: 'Test VD',
    city: 'Ankara',
    district: 'Çankaya',
    alias: 'urn:mail:defaultpk@9876543210',
  },

  /** Test gerçek kişi */
  person: {
    taxId: '12345678901',
    name: 'Ahmet Yılmaz',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    city: 'İzmir',
  },

  /** Test ürün satırları */
  lines: [
    {
      itemCode: 'TEST-001',
      itemName: 'Test Ürün 1',
      quantity: 2,
      price: 100,
      vatRate: 20,
    },
    {
      itemCode: 'TEST-002',
      itemName: 'Test Ürün 2',
      quantity: 1,
      price: 500,
      vatRate: 20,
    },
  ],

  /** Boş fatura response */
  emptyInvoiceResult: {
    uuid: '00000000-0000-0000-0000-000000000000',
    invoiceNumber: 'TEST2024000000001',
    status: 'SENT',
  },
};

/**
 * Test assertion helpers
 */
export const assertions = {
  /**
   * Invoice request'in geçerli olduğunu kontrol eder
   */
  isValidInvoiceRequest(request: InvoiceRequest): boolean {
    return !!(
      request.Invoice &&
      request.Invoice.SupplierParty &&
      request.Invoice.CustomerParty &&
      request.Invoice.DocumentLines &&
      request.Invoice.DocumentLines.length > 0
    );
  },

  /**
   * Toplam tutarların doğru hesaplandığını kontrol eder
   */
  areTotalsCorrect(request: InvoiceRequest): boolean {
    const lines = request.Invoice.DocumentLines || [];
    const total = request.Invoice.LegalMonetaryTotal;

    if (!total) return false;

    const calculatedLineTotal = lines.reduce(
      (sum, line) => sum + (line.LineExtensionAmount || 0),
      0
    );

    return Math.abs(calculatedLineTotal - total.LineExtensionAmount) < 0.01;
  },

  /**
   * VKN/TCKN formatını kontrol eder
   */
  isValidTaxId(taxId: string): boolean {
    return /^\d{10}$/.test(taxId) || /^\d{11}$/.test(taxId);
  },
};

/**
 * Test data generator
 */
export const generators = {
  /**
   * Rastgele VKN üretir
   */
  randomVKN(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  },

  /**
   * Rastgele TCKN üretir
   */
  randomTCKN(): string {
    return Math.floor(10000000000 + Math.random() * 90000000000).toString();
  },

  /**
   * Rastgele fatura numarası üretir
   */
  randomInvoiceNumber(prefix: string = 'TEST'): string {
    return generateInvoiceNumber(prefix);
  },

  /**
   * Rastgele tarih üretir (son 30 gün içinde)
   */
  randomRecentDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString().split('T')[0];
  },

  /**
   * Rastgele tutar üretir
   */
  randomAmount(min: number = 100, max: number = 10000): number {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  },
};
