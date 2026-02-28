import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_URLS } from './constants';
import { EtsError, AuthenticationError } from './errors';
import type {
  EtsClientConfig,
  AuthCredentials,
  ApiResponse,
  Integrator,
  UserCheckResult,
  UserAliasResult,
  ExchangeRate,
  PdfResult,
  InvoiceRequest,
  InvoiceResult,
  InvoiceStatus,
  InvoiceListQuery,
  InvoiceListItem,
  RespondRequest,
  ArchiveInvoiceRequest,
  DispatchRequest,
  DispatchResult,
  DispatchStatus,
  ProducerReceiptRequest,
  ProducerReceiptResult,
  ProducerReceiptStatus,
} from './types';

/**
 * Entegre ETS API Client
 *
 * @example
 * ```typescript
 * import { EtsClient } from '@entegre/ets-sdk';
 *
 * const client = new EtsClient({
 *   integrator: 'UYM',
 *   softwareId: 'MY-APP'
 * });
 *
 * // Kimlik doğrulama
 * await client.authenticate({
 *   partyId: '1234567890',
 *   username: 'user',
 *   password: 'pass'
 * });
 *
 * // E-Fatura mükellefi kontrolü
 * const result = await client.checkEInvoiceUser('9876543210');
 * console.log(result.data?.isActive);
 * ```
 */
export class EtsClient {
  private readonly client: AxiosInstance;
  private etsToken: string | null = null;
  private readonly config: Required<Omit<EtsClientConfig, 'timeout'>> & { timeout: number };

  constructor(config: EtsClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || API_URLS.PRODUCTION,
      integrator: config.integrator || 'UYM',
      softwareId: config.softwareId || 'ETS-SDK',
      timeout: config.timeout || 30000,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message = this.extractErrorMessage(error);
        throw new EtsError(message, {
          statusCode: error.response?.status,
          response: error.response?.data,
        });
      }
    );
  }

  // ==================== AUTH ====================

  /**
   * Kimlik doğrulama yapar ve EtsToken alır.
   *
   * @param credentials - Kimlik bilgileri
   * @returns Token içeren yanıt
   *
   * @example
   * ```typescript
   * const result = await client.authenticate({
   *   partyId: '1234567890',
   *   username: 'user',
   *   password: 'pass'
   * });
   * console.log('Token:', client.getToken());
   * ```
   */
  async authenticate(credentials: AuthCredentials): Promise<ApiResponse<{ token: string }>> {
    const response = await this.client.post<ApiResponse<{ token: string }>>('/auth/token', {
      PartyIdentificationId: credentials.partyId,
      Username: credentials.username,
      Password: credentials.password,
      SoftwareId: this.config.softwareId,
      Integrator: this.config.integrator,
    });

    if (response.data.success && response.data.data?.token) {
      this.etsToken = response.data.data.token;
    } else {
      throw new AuthenticationError(response.data.message || 'Kimlik doğrulama başarısız');
    }

    return response.data;
  }

  /**
   * Token'ı manuel olarak ayarlar.
   */
  setToken(token: string): void {
    this.etsToken = token;
  }

  /**
   * Mevcut token'ı döndürür.
   */
  getToken(): string | null {
    return this.etsToken;
  }

  /**
   * Token'ın ayarlanıp ayarlanmadığını kontrol eder.
   */
  isAuthenticated(): boolean {
    return this.etsToken !== null;
  }

  // ==================== E-FATURA ====================

  /**
   * E-Fatura mükellefi mi sorgular.
   *
   * @param partyId - VKN veya TCKN
   */
  async checkEInvoiceUser(partyId: string): Promise<ApiResponse<UserCheckResult>> {
    return this.post(`/invoice/user/${partyId}`);
  }

  /**
   * Kullanıcı alias listesini getirir.
   *
   * @param partyId - VKN veya TCKN
   */
  async getUserAliases(partyId: string): Promise<ApiResponse<UserAliasResult>> {
    return this.post(`/invoice/user/${partyId}/alias`);
  }

  /**
   * E-Fatura gönderir.
   *
   * @param request - Fatura isteği
   */
  async sendInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/invoice', request);
  }

  /**
   * Taslak fatura gönderir.
   *
   * @param request - Fatura isteği
   */
  async sendDraftInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/invoice/draft', request);
  }

  /**
   * Fatura durumunu sorgular.
   *
   * @param uuid - Fatura UUID'si
   */
  async getInvoiceStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.post(`/invoice/${uuid}/status`);
  }

  /**
   * Faturaya yanıt verir (Kabul/Red).
   *
   * @param uuid - Fatura UUID'si
   * @param request - Yanıt isteği
   */
  async respondInvoice(uuid: string, request: RespondRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post(`/invoice/${uuid}/respond`, {
      ResponseType: request.responseType,
      Description: request.description,
    });
  }

  /**
   * Gelen fatura listesini getirir.
   *
   * @param query - Sorgu parametreleri
   */
  async getInboxInvoices(query: InvoiceListQuery): Promise<ApiResponse<InvoiceListItem[]>> {
    return this.post('/invoice/inbox', query);
  }

  /**
   * Fatura PDF'ini indirir.
   *
   * @param uuid - Fatura UUID'si
   */
  async getInvoicePdf(uuid: string): Promise<ApiResponse<PdfResult>> {
    return this.post(`/invoice/${uuid}/pdf`);
  }

  // ==================== E-ARSIV ====================

  /**
   * E-Arşiv fatura gönderir.
   *
   * @param request - Fatura isteği
   */
  async sendEArchiveInvoice(request: ArchiveInvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/earchive', request);
  }

  /**
   * Toplu E-Arşiv fatura gönderir.
   *
   * @param requests - Fatura istekleri
   */
  async sendEArchiveInvoices(requests: ArchiveInvoiceRequest[]): Promise<ApiResponse<InvoiceResult[]>> {
    return this.post('/earchive/batch', { Invoices: requests });
  }

  /**
   * E-Arşiv fatura durumunu sorgular.
   *
   * @param uuid - Fatura UUID'si
   */
  async getEArchiveStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.post(`/earchive/${uuid}/status`);
  }

  /**
   * E-Arşiv faturayı iptal eder.
   *
   * @param uuid - Fatura UUID'si
   * @param cancelDate - İptal tarihi (YYYY-MM-DD)
   */
  async cancelEArchive(uuid: string, cancelDate?: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/earchive/${uuid}/cancel`, { CancelDate: cancelDate });
  }

  /**
   * E-Arşiv fatura PDF'ini indirir.
   *
   * @param uuid - Fatura UUID'si
   */
  async getEArchivePdf(uuid: string): Promise<ApiResponse<PdfResult>> {
    return this.post(`/earchive/${uuid}/pdf`);
  }

  /**
   * E-Arşiv fatura listesini getirir.
   *
   * @param query - Sorgu parametreleri
   */
  async getEArchiveList(query: InvoiceListQuery): Promise<ApiResponse<InvoiceListItem[]>> {
    return this.post('/earchive/list', query);
  }

  // ==================== E-IRSALIYE ====================

  /**
   * E-İrsaliye mükellefi mi sorgular.
   *
   * @param partyId - VKN veya TCKN
   */
  async checkEDispatchUser(partyId: string): Promise<ApiResponse<UserCheckResult>> {
    return this.post(`/dispatch/user/${partyId}`);
  }

  /**
   * E-İrsaliye kullanıcı alias listesini getirir.
   *
   * @param partyId - VKN veya TCKN
   */
  async getDispatchUserAliases(partyId: string): Promise<ApiResponse<UserAliasResult>> {
    return this.post(`/dispatch/user/${partyId}/alias`);
  }

  /**
   * E-İrsaliye gönderir.
   *
   * @param request - İrsaliye isteği
   */
  async sendDispatch(request: DispatchRequest): Promise<ApiResponse<DispatchResult>> {
    return this.post('/dispatch', request);
  }

  /**
   * Taslak E-İrsaliye gönderir.
   *
   * @param request - İrsaliye isteği
   */
  async sendDraftDispatch(request: DispatchRequest): Promise<ApiResponse<DispatchResult>> {
    return this.post('/dispatch/draft', request);
  }

  /**
   * E-İrsaliye durumunu sorgular.
   *
   * @param uuid - İrsaliye UUID'si
   */
  async getDispatchStatus(uuid: string): Promise<ApiResponse<DispatchStatus>> {
    return this.post(`/dispatch/${uuid}/status`);
  }

  // ==================== E-MUSTAHSIL ====================

  /**
   * E-Müstahsil makbuzu gönderir.
   *
   * @param request - Makbuz isteği
   */
  async sendProducerReceipt(request: ProducerReceiptRequest): Promise<ApiResponse<ProducerReceiptResult>> {
    return this.post('/producer', request);
  }

  /**
   * Toplu E-Müstahsil makbuzu gönderir.
   *
   * @param requests - Makbuz istekleri
   */
  async sendProducerReceipts(requests: ProducerReceiptRequest[]): Promise<ApiResponse<ProducerReceiptResult[]>> {
    return this.post('/producer/batch', { Receipts: requests });
  }

  /**
   * E-Müstahsil makbuz durumunu sorgular.
   *
   * @param uuid - Makbuz UUID'si
   */
  async getProducerReceiptStatus(uuid: string): Promise<ApiResponse<ProducerReceiptStatus>> {
    return this.post(`/producer/${uuid}/status`);
  }

  // ==================== DOVIZ KURU ====================

  /**
   * Belirli bir döviz kurunu sorgular.
   *
   * @param currency - Para birimi kodu (USD, EUR, vb.)
   * @param date - Tarih (YYYY-MM-DD)
   */
  async getExchangeRate(currency: string, date?: string): Promise<ApiResponse<ExchangeRate>> {
    const params = new URLSearchParams({ currency });
    if (date) params.append('date', date);
    return this.get(`/currency/rate?${params.toString()}`);
  }

  /**
   * Tüm döviz kurlarını getirir.
   *
   * @param date - Tarih (YYYY-MM-DD)
   */
  async getAllExchangeRates(date?: string): Promise<ApiResponse<ExchangeRate[]>> {
    const params = date ? `?date=${date}` : '';
    return this.get(`/currency/rates${params}`);
  }

  // ==================== PRIVATE METHODS ====================

  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    this.ensureAuthenticated();
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${separator}EtsToken=${this.etsToken}`;
    const response = await this.client.get<ApiResponse<T>>(url);
    return response.data;
  }

  private async post<T>(endpoint: string, data: object = {}): Promise<ApiResponse<T>> {
    this.ensureAuthenticated();
    const requestData = { ...data, EtsToken: this.etsToken };
    const response = await this.client.post<ApiResponse<T>>(endpoint, requestData);
    return response.data;
  }

  private ensureAuthenticated(): void {
    if (!this.etsToken) {
      throw new AuthenticationError('Token ayarlanmamış. Önce authenticate() çağırın veya setToken() ile token ayarlayın.');
    }
  }

  private extractErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as Record<string, unknown>;
      if (typeof data.message === 'string') return data.message;
      if (typeof data.Message === 'string') return data.Message;
    }
    return error.message || 'Bilinmeyen bir hata oluştu';
  }
}

/**
 * EtsClient factory fonksiyonu
 *
 * @param config - Client ayarları
 * @returns EtsClient instance
 *
 * @example
 * ```typescript
 * import { createEtsClient } from '@entegre/ets-sdk';
 *
 * const client = createEtsClient({ integrator: 'UYM' });
 * ```
 */
export function createEtsClient(config?: EtsClientConfig): EtsClient {
  return new EtsClient(config);
}
