import {
  RwaPlatform,
  RwaToken,
  RwaSearchResult,
  RwaPriceResult,
  UnderlyingProfile,
  QuoteResponse,
  ApproveTransactionResponse,
  SwapResponse,
  OrderSubmitResponse,
  OrderStatusResponse
} from './types.js';

export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
export const ROUTER_APPROVE_TARGET = '0x111111125421ca6dc452d289314280a0f8842a65';

export const MOCK_PLATFORMS: RwaPlatform[] = [
  {
    platformId: 'bstock',
    tickerCount: 42,
    chainDistribution: ['56']
  },
  {
    platformId: 'ondo',
    tickerCount: 18,
    chainDistribution: ['56']
  }
];

export const MOCK_TOKENS: Record<string, RwaToken> = {
  // NVDA bstock
  'NVDA-bstock': {
    platformId: 'bstock',
    underlyingTicker: 'NVDA',
    tokenContractAddress: '0xaEc4B58ff2270921008781B85D9d3809C0637Ff0',
    tokenSymbol: 'bNVDA',
    decimals: 18,
    tokenToShareRatio: 1.0,
    tokenPrice: '126.42',
    referencePrice: '126.40',
    volume24H: '8520300.50',
    statusInfo: {
      openState: 'open',
      marketStatus: 'regular',
      reasonCode: 'TRADING',
      reasonMsg: 'Market is open for continuous trading'
    }
  },
  // NVDA ondo
  'NVDA-ondo': {
    platformId: 'ondo',
    underlyingTicker: 'NVDA',
    tokenContractAddress: '0x438644A14352D75e3E1Fe2F8D4058d926b47E537',
    tokenSymbol: 'oNVDA',
    decimals: 18,
    tokenToShareRatio: 1.0,
    tokenPrice: '126.75',
    referencePrice: '126.40',
    volume24H: '3420100.00',
    statusInfo: {
      openState: 'open',
      marketStatus: 'regular',
      reasonCode: 'TRADING',
      reasonMsg: 'Market is open for continuous trading'
    }
  },
  // NVDA earnings window (simulating deferral)
  'NVDA-earnings': {
    platformId: 'bstock',
    underlyingTicker: 'NVDA',
    tokenContractAddress: '0xaEc4B58ff2270921008781B85D9d3809C0637Ff0',
    tokenSymbol: 'bNVDA',
    decimals: 18,
    tokenToShareRatio: 1.0,
    tokenPrice: '126.42',
    referencePrice: '126.40',
    volume24H: '8520300.50',
    statusInfo: {
      openState: 'pause',
      marketStatus: 'pause',
      reasonCode: 'ASSET_LIMITED',
      reasonMsg: 'Trading restricted: corporate earnings window in effect',
      nextOpenTime: Date.now() + 86400000
    }
  },
  // AAPL bstock
  'AAPL-bstock': {
    platformId: 'bstock',
    underlyingTicker: 'AAPL',
    tokenContractAddress: '0x53A7A57f724391Fba09d57D2C04e76c125d88f61',
    tokenSymbol: 'bAAPL',
    decimals: 18,
    tokenToShareRatio: 1.0,
    tokenPrice: '232.15',
    referencePrice: '232.10',
    volume24H: '6450200.00',
    statusInfo: {
      openState: 'open',
      marketStatus: 'regular',
      reasonCode: 'TRADING'
    }
  },
  // TSLA bstock
  'TSLA-bstock': {
    platformId: 'bstock',
    underlyingTicker: 'TSLA',
    tokenContractAddress: '0x32A6922C0898687796030F87A7D7b59eF8682977',
    tokenSymbol: 'bTSLA',
    decimals: 18,
    tokenToShareRatio: 1.0,
    tokenPrice: '218.80',
    referencePrice: '218.75',
    volume24H: '12100500.00',
    statusInfo: {
      openState: 'open',
      marketStatus: 'regular',
      reasonCode: 'TRADING'
    }
  }
};

export function getMockSearch(keyword: string): RwaSearchResult {
  const upper = keyword.toUpperCase();
  const matching = Object.values(MOCK_TOKENS)
    .filter(t => t.underlyingTicker === upper)
    .map(t => ({
      platformId: t.platformId,
      tokenContractAddress: t.tokenContractAddress,
      tokenSymbol: t.tokenSymbol,
      assetType: 'EQUITY_TOKEN'
    }));
  return { assets: matching };
}

export function getMockPrices(addresses: string[]): RwaPriceResult[] {
  return addresses.map(addr => {
    const token = Object.values(MOCK_TOKENS).find(
      t => t.tokenContractAddress.toLowerCase() === addr.toLowerCase()
    );
    if (token) {
      return {
        tokenContractAddress: addr,
        tokenPrice: token.tokenPrice,
        referencePrice: token.referencePrice,
        tokenPriceUpdatedAt: Date.now()
      };
    }
    return {
      tokenContractAddress: addr,
      tokenPrice: '100.00',
      referencePrice: '100.00',
      tokenPriceUpdatedAt: Date.now()
    };
  });
}

export function getMockProfile(address: string): UnderlyingProfile {
  return {
    tokenContractAddress: address,
    tokenToShareRatio: 1.0,
    protections: {
      dailyAttestationReport: 'https://attestations.rwa.io/daily/report-latest.pdf',
      monthlyAttestationReport: 'https://attestations.rwa.io/monthly/custody-audit.pdf',
      collateralReport: 'https://attestations.rwa.io/collateral/100pct-us-treasuries.pdf'
    }
  };
}

export function getMockQuote(
  amountUsdtWei: string,
  toTokenAddress: string,
  userWallet: string
): QuoteResponse {
  // Amount in USDT (18 decimals)
  const amountUsdt = Number(BigInt(amountUsdtWei)) / 1e18;
  const token = Object.values(MOCK_TOKENS).find(
    t => t.tokenContractAddress.toLowerCase() === toTokenAddress.toLowerCase()
  ) || MOCK_TOKENS['NVDA-bstock'];

  const tokenPriceNum = parseFloat(token.tokenPrice);
  const rawTokensOut = amountUsdt / tokenPriceNum;

  // bStock typically tighter spread (0.15% fee, 0.08% impact)
  // Ondo has slightly wider spread (0.25% fee, 0.18% impact)
  const isOndo = token.platformId === 'ondo';
  const feePct = isOndo ? 0.0025 : 0.0015;
  const impactPct = (amountUsdt > 200 ? 0.002 : 0.0008) * (isOndo ? 1.5 : 1.0);
  const netTokensOut = rawTokensOut * (1 - feePct - impactPct);
  const netTokensOutWei = BigInt(Math.floor(netTokensOut * 1e18)).toString();

  const now = Date.now();
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    routes: [
      {
        quoteId,
        vendorName: isOndo ? 'InchFusion' : 'PcsXRfq',
        toTokenAmount: netTokensOutWei,
        tradeFee: (amountUsdt * feePct).toFixed(2),
        estimateGasFee: '0.00045',
        priceImpactPercent: (impactPct * 100).toFixed(2),
        executionMode: 'RFQ',
        approveTarget: ROUTER_APPROVE_TARGET,
        isBest: true,
        ttlSeconds: 30,
        expiresAt: now + 30000
      }
    ]
  };
}

export function getMockSwap(quoteId: string, userWallet: string): SwapResponse {
  return {
    executionMode: 'RFQ',
    rfq: {
      vendor: 'PcsXRfq',
      txType: 'RFQ_SWAP_V2',
      orderId: `rfq_ord_${quoteId}`,
      signingScheme: 'EIP712',
      typedDataToSign: {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          RfqOrder: [
            { name: 'quoteId', type: 'string' },
            { name: 'user', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        },
        primaryType: 'RfqOrder',
        domain: {
          name: 'BinanceRfqRouter',
          version: '1',
          chainId: 56,
          verifyingContract: ROUTER_APPROVE_TARGET
        },
        message: {
          quoteId,
          user: userWallet,
          nonce: 1,
          deadline: Math.floor(Date.now() / 1000) + 60
        }
      }
    }
  };
}

export function getMockOrderStatus(orderId: string): OrderStatusResponse {
  const hash = '0x8f' + Array.from({ length: 62 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return {
    orderId,
    status: 'FILLED',
    txHash: hash,
    filledAt: Date.now()
  };
}
