export interface BinanceClientConfig {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  chainId?: number;
  recvWindow?: number;
  mockMode?: boolean;
  onDxEvent?: (event: DxEventInput) => void;
}

export interface DxEventInput {
  category: 'onboarding' | 'docs' | 'api_pitfall' | 'latency' | 'ai_stack' | 'tokenized_stock' | 'redesign' | 'capability';
  endpoint: string;
  latency_ms: number;
  error_code?: string;
  error_message?: string;
  docs_page?: string;
  note: string;
}

export interface RwaPlatform {
  platformId: 'ondo' | 'bstock' | 'xstocks';
  tickerCount: number;
  chainDistribution: string[];
}

export interface StatusInfo {
  openState: 'open' | 'closed' | 'pause';
  marketStatus: 'premarket' | 'regular' | 'postmarket' | 'overnight' | 'closed' | 'pause';
  reasonCode: 'TRADING' | 'MARKET_CLOSED' | 'MARKET_PAUSED' | 'MARKET_MAINTENANCE' | 'ASSET_PAUSED' | 'ASSET_LIMITED' | 'UNSUPPORTED';
  reasonMsg?: string;
  nextOpenTime?: number;
  nextCloseTime?: number;
}

export interface RwaToken {
  platformId: string;
  underlyingTicker: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  decimals: number;
  tokenToShareRatio: number;
  tokenPrice: string;
  referencePrice: string;
  volume24H?: string;
  statusInfo: StatusInfo;
}

export interface RwaSearchResult {
  assets: Array<{
    platformId: string;
    tokenContractAddress: string;
    tokenSymbol: string;
    assetType?: string;
  }>;
}

export interface RwaPriceResult {
  tokenContractAddress: string;
  tokenPrice: string;
  referencePrice: string;
  tokenPriceUpdatedAt: number;
}

export interface UnderlyingProfile {
  tokenContractAddress: string;
  tokenToShareRatio: number;
  protections: {
    dailyAttestationReport?: string;
    monthlyAttestationReport?: string;
    collateralReport?: string;
  };
}

export interface RfqQuoteParams {
  binanceChainId?: number;
  amount: string; // smallest units integer string (e.g. 25000000000000000000 for 25 USDT)
  fromTokenAddress: string;
  toTokenAddress: string;
  userWalletAddress: string;
}

export interface RfqRoute {
  quoteId: string;
  vendorName: string; // e.g. "PcsXRfq", "InchFusion", "CowSwap"
  toTokenAmount: string;
  tradeFee: string; // USD
  estimateGasFee: string;
  priceImpactPercent: string;
  executionMode: 'RFQ';
  approveTarget: string;
  isBest: boolean;
  ttlSeconds?: number;
  expiresAt?: number;
}

export interface QuoteResponse {
  routes: RfqRoute[];
}

export interface ApproveTransactionResponse {
  data: string;
  dexContractAddress: string;
  gasLimit: string;
  gasPrice: string;
}

export interface SwapParams {
  quoteId: string;
  amount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  userWalletAddress: string;
  slippagePercent?: string;
  priceImpactProtectionPercent?: number; // default 1-2 per spec
  binanceChainId?: number;
}

export interface SwapResponse {
  executionMode: 'RFQ';
  routerResult?: Record<string, unknown>;
  rfq: {
    vendor: string;
    txType: string;
    orderId?: string;
    typedDataToSign: Record<string, unknown> | string;
    signingScheme: string;
    signatureData?: Record<string, unknown>;
  };
}

export interface OrderSubmitParams {
  requestId: string;
  userSignature: string;
  vendor: string;
  quoteId: string;
  signingScheme?: string;
}

export interface OrderSubmitResponse {
  orderId: string;
  status: 'PENDING_VENDOR' | 'PENDING_ONCHAIN' | 'FILLED' | 'FINISHED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  message?: string;
}

export interface OrderStatusResponse {
  orderId: string;
  status: 'PENDING_VENDOR' | 'PENDING_ONCHAIN' | 'FILLED' | 'FINISHED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  txHash?: string;
  fromAmount?: string;
  toAmount?: string;
  filledAt?: number;
  error?: string;
}
