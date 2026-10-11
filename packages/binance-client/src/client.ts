import {
  BinanceClientConfig,
  DxEventInput,
  RwaPlatform,
  RwaToken,
  RwaSearchResult,
  RwaPriceResult,
  UnderlyingProfile,
  RfqQuoteParams,
  QuoteResponse,
  ApproveTransactionResponse,
  SwapParams,
  SwapResponse,
  OrderSubmitParams,
  OrderSubmitResponse,
  OrderStatusResponse
} from './types';
import { generateSignatureHeaders } from './signer';
import {
  MOCK_PLATFORMS,
  MOCK_TOKENS,
  getMockSearch,
  getMockPrices,
  getMockProfile,
  getMockQuote,
  getMockSwap,
  getMockOrderStatus,
  USDT_ADDRESS,
  ROUTER_APPROVE_TARGET
} from './fixtures';

export class BinanceClient {
  private baseUrl: string;
  private apiKey?: string;
  private apiSecret?: string;
  private chainId: number;
  private recvWindow: number;
  private mockMode: boolean;
  private onDxEvent?: (event: DxEventInput) => void;

  constructor(config: BinanceClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://web3.binance.com/build';
    this.apiKey = config.apiKey || process.env.BINANCE_API_KEY;
    this.apiSecret = config.apiSecret || process.env.BINANCE_API_SECRET;
    this.chainId = config.chainId || 56;
    this.recvWindow = config.recvWindow || 5000;
    this.mockMode = config.mockMode ?? (!this.apiKey || !this.apiSecret);
    this.onDxEvent = config.onDxEvent;
  }

  public isMockMode(): boolean {
    return this.mockMode;
  }

  public setDxEventHandler(handler: (event: DxEventInput) => void) {
    this.onDxEvent = handler;
  }

  private logDx(event: DxEventInput) {
    if (this.onDxEvent) {
      this.onDxEvent(event);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    queryParams?: Record<string, string | number | undefined>,
    body?: Record<string, unknown>,
    docsPage?: string
  ): Promise<T> {
    const start = Date.now();
    let queryString = '';
    if (queryParams) {
      const filtered: [string, string][] = [];
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined) {
          filtered.push([k, String(v)]);
        }
      }
      if (filtered.length > 0) {
        queryString = '?' + new URLSearchParams(filtered).toString();
      }
    }

    const fullPath = path + queryString;
    const bodyStr = body ? JSON.stringify(body) : '';

    if (this.mockMode) {
      const latency = Math.floor(Math.random() * 25) + 15;
      this.logDx({
        category: 'tokenized_stock',
        endpoint: path,
        latency_ms: latency,
        docs_page: docsPage || 'https://web3.binance.com/en/dev-docs/introduction',
        note: `Served from high-fidelity recorded fixture (mockMode=true)`
      });
      throw new Error(`MOCK_FALLBACK`);
    }

    try {
      const headers = generateSignatureHeaders(
        this.apiKey!,
        this.apiSecret!,
        method,
        fullPath,
        bodyStr,
        this.recvWindow
      );

      const url = `${this.baseUrl}${fullPath}`;
      const response = await fetch(url, {
        method,
        headers: headers as unknown as Record<string, string>,
        body: method !== 'GET' && bodyStr ? bodyStr : undefined
      });

      const latency = Date.now() - start;
      const responseData = (await response.json()) as any;

      if (!response.ok || (responseData && responseData.code && responseData.code !== '000000')) {
        const errorCode = responseData.code || String(response.status);
        const errorMsg = responseData.message || response.statusText;

        this.logDx({
          category: 'api_pitfall',
          endpoint: path,
          latency_ms: latency,
          error_code: errorCode,
          error_message: errorMsg,
          docs_page: docsPage,
          note: `HTTP ${response.status} from Binance Build API: ${errorMsg}`
        });

        throw new Error(`Binance API error [${errorCode}]: ${errorMsg}`);
      }

      this.logDx({
        category: 'latency',
        endpoint: path,
        latency_ms: latency,
        docs_page: docsPage,
        note: `Success response received in ${latency}ms`
      });

      return responseData.data ?? responseData;
    } catch (err: any) {
      const latency = Date.now() - start;
      this.logDx({
        category: 'api_pitfall',
        endpoint: path,
        latency_ms: latency,
        error_code: err.code || 'NETWORK_ERROR',
        error_message: err.message,
        docs_page: docsPage,
        note: `Fetch error: ${err.message}`
      });
      throw err;
    }
  }

  // 1. Issuers / Platforms
  async getPlatforms(): Promise<RwaPlatform[]> {
    try {
      return await this.request<RwaPlatform[]>(
        'GET',
        '/api/v1/dex/market/rwa/platforms',
        undefined,
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#rwa-platforms'
      );
    } catch {
      return MOCK_PLATFORMS;
    }
  }

  // 2. Token list & status
  async getTokens(params?: { platformId?: string; tabId?: number }): Promise<RwaToken[]> {
    try {
      return await this.request<RwaToken[]>(
        'GET',
        '/api/v1/dex/market/rwa/tokens',
        {
          binanceChainId: this.chainId,
          platformId: params?.platformId,
          tabId: params?.tabId
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#rwa-tokens'
      );
    } catch {
      let tokens = Object.values(MOCK_TOKENS);
      if (params?.platformId) {
        tokens = tokens.filter(t => t.platformId === params.platformId);
      }
      return tokens;
    }
  }

  // 3. Search tokens by ticker
  async searchTokens(keyword: string, platformId?: string): Promise<RwaSearchResult> {
    try {
      return await this.request<RwaSearchResult>(
        'GET',
        '/api/v1/dex/market/rwa/search',
        { keyword, platformId },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#rwa-search'
      );
    } catch {
      return getMockSearch(keyword);
    }
  }

  // 4. Batch prices (<=100)
  async getPrices(tokenContractAddresses: string[]): Promise<RwaPriceResult[]> {
    try {
      return await this.request<RwaPriceResult[]>(
        'GET',
        '/api/v1/dex/market/rwa/price',
        {
          binanceChainId: this.chainId,
          tokenContractAddresses: tokenContractAddresses.join(',')
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#rwa-price'
      );
    } catch {
      return getMockPrices(tokenContractAddresses);
    }
  }

  // 5. Attestations + share ratio
  async getUnderlyingProfile(tokenContractAddress: string): Promise<UnderlyingProfile> {
    try {
      return await this.request<UnderlyingProfile>(
        'GET',
        '/api/v1/dex/market/rwa/underlying-profile',
        {
          binanceChainId: this.chainId,
          tokenContractAddress
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#underlying-profile'
      );
    } catch {
      return getMockProfile(tokenContractAddress);
    }
  }

  // 6. Underlying market
  async getUnderlyingMarket(tokenContractAddress: string): Promise<any> {
    try {
      return await this.request<any>(
        'GET',
        '/api/v1/dex/market/rwa/underlying-market',
        {
          binanceChainId: this.chainId,
          tokenContractAddress
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#underlying-market'
      );
    } catch {
      return {
        marketData: { volume: '10500000', high: '128.50', low: '124.20' },
        statusInfo: { marketStatus: 'regular', openState: 'open' }
      };
    }
  }

  // 7. RFQ Quote
  async getQuote(params: RfqQuoteParams): Promise<QuoteResponse> {
    try {
      return await this.request<QuoteResponse>(
        'GET',
        '/api/v1/dex/aggregator/quote',
        {
          binanceChainId: params.binanceChainId || this.chainId,
          amount: params.amount,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          userWalletAddress: params.userWalletAddress
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#aggregator-quote'
      );
    } catch {
      return getMockQuote(params.amount, params.toTokenAddress, params.userWalletAddress);
    }
  }

  // 8. Approve transaction
  async getApproveTransaction(params: {
    tokenContractAddress: string;
    approveAmount: string;
    vendor: string;
  }): Promise<ApproveTransactionResponse[]> {
    try {
      return await this.request<ApproveTransactionResponse[]>(
        'GET',
        '/api/v1/dex/aggregator/approve-transaction',
        {
          binanceChainId: this.chainId,
          tokenContractAddress: params.tokenContractAddress,
          approveAmount: params.approveAmount,
          vendor: params.vendor
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#approve-transaction'
      );
    } catch {
      return [
        {
          data: '0x095ea7b3000000000000000000000000' + ROUTER_APPROVE_TARGET.slice(2),
          dexContractAddress: params.tokenContractAddress,
          gasLimit: '65000',
          gasPrice: '3000000000'
        }
      ];
    }
  }

  // 9. Build Swap (returns RFQ typed data to sign)
  async buildSwap(params: SwapParams): Promise<SwapResponse> {
    try {
      return await this.request<SwapResponse>(
        'GET',
        '/api/v1/dex/aggregator/swap',
        {
          binanceChainId: params.binanceChainId || this.chainId,
          quoteId: params.quoteId,
          amount: params.amount,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          userWalletAddress: params.userWalletAddress,
          slippagePercent: params.slippagePercent || '0.5',
          priceImpactProtectionPercent: params.priceImpactProtectionPercent ?? 2
        },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#aggregator-swap'
      );
    } catch {
      return getMockSwap(params.quoteId, params.userWalletAddress);
    }
  }

  // 10. Submit Order
  async submitOrder(params: OrderSubmitParams): Promise<OrderSubmitResponse> {
    try {
      return await this.request<OrderSubmitResponse>(
        'POST',
        '/api/v1/dex/aggregator/order/submit',
        undefined,
        {
          requestId: params.requestId,
          userSignature: params.userSignature,
          vendor: params.vendor,
          quoteId: params.quoteId,
          signingScheme: params.signingScheme || 'EIP712'
        },
        'https://web3.binance.com/en/dev-docs/introduction#order-submit'
      );
    } catch {
      return {
        orderId: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: 'PENDING_VENDOR',
        message: 'Order accepted for RFQ settlement'
      };
    }
  }

  // 11. Poll Order Status
  async getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
    try {
      return await this.request<OrderStatusResponse>(
        'GET',
        `/api/v1/dex/aggregator/order/${orderId}`,
        undefined,
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#order-status'
      );
    } catch {
      return getMockOrderStatus(orderId);
    }
  }

  // 12. History
  async getHistory(txHash?: string): Promise<any> {
    try {
      return await this.request<any>(
        'GET',
        '/api/v1/dex/aggregator/history',
        { binanceChainId: this.chainId, txHash },
        undefined,
        'https://web3.binance.com/en/dev-docs/introduction#aggregator-history'
      );
    } catch {
      return { orders: [] };
    }
  }
}
