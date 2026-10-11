import { RwaToken, UnderlyingProfile } from '@afterbells/binance-client';

export interface WalletReadinessInput {
  usdtBalance: number;
  bnbBalance: number;
  usdtAllowance: number;
  amountRequired: number;
}

export interface ReadinessCheckResult {
  ready: boolean;
  status: 'READY' | 'DEFERRED' | 'INSUFFICIENT_FUNDS' | 'NEEDS_ALLOWANCE';
  deferReason?: string;
  reasonCode?: string;
  checks: {
    marketOpen: boolean;
    notPaused: boolean;
    earningsSafe: boolean;
    usdtFunded: boolean;
    bnbGasFunded: boolean;
    allowanceSufficient: boolean;
    attestationPresent: boolean;
  };
  attestationReportUrl?: string;
}

const DEFER_REASON_CODES = new Set([
  'ASSET_PAUSED',
  'ASSET_LIMITED',
  'MARKET_PAUSED',
  'MARKET_MAINTENANCE',
  'UNSUPPORTED'
]);

export function checkReadiness(
  token: RwaToken,
  profile?: UnderlyingProfile,
  wallet?: WalletReadinessInput
): ReadinessCheckResult {
  const reasonCode = token.statusInfo?.reasonCode || 'TRADING';
  const openState = token.statusInfo?.openState || 'open';
  const marketStatus = token.statusInfo?.marketStatus || 'regular';

  const isDeferredCode = DEFER_REASON_CODES.has(reasonCode);
  const isPause = openState === 'pause' || marketStatus === 'pause';
  const isEarningsLimited = reasonCode === 'ASSET_LIMITED';

  const marketOpen = openState !== 'closed';
  const notPaused = !isPause && !isDeferredCode;
  const earningsSafe = !isEarningsLimited;

  const attestationPresent = Boolean(
    profile?.protections?.dailyAttestationReport ||
    profile?.protections?.monthlyAttestationReport
  );

  const usdtFunded = wallet ? wallet.usdtBalance >= wallet.amountRequired : true;
  const bnbGasFunded = wallet ? wallet.bnbBalance >= 0.002 : true;
  const allowanceSufficient = wallet ? wallet.usdtAllowance >= wallet.amountRequired : true;

  const checks = {
    marketOpen,
    notPaused,
    earningsSafe,
    usdtFunded,
    bnbGasFunded,
    allowanceSufficient,
    attestationPresent
  };

  if (!notPaused || !earningsSafe) {
    const deferReason = token.statusInfo?.reasonMsg ||
      (isEarningsLimited
        ? 'Trading limited: earnings window in effect. Order deferred until window closes.'
        : `Trading paused: ${reasonCode} (${marketStatus})`);
    return {
      ready: false,
      status: 'DEFERRED',
      deferReason,
      reasonCode,
      checks,
      attestationReportUrl: profile?.protections?.dailyAttestationReport
    };
  }

  if (!usdtFunded || !bnbGasFunded) {
    return {
      ready: false,
      status: 'INSUFFICIENT_FUNDS',
      deferReason: !usdtFunded
        ? `USDT balance ($${wallet?.usdtBalance.toFixed(2)}) is less than required ($${wallet?.amountRequired.toFixed(2)})`
        : `BNB gas balance (${wallet?.bnbBalance.toFixed(4)} BNB) is below required 0.002 BNB threshold`,
      reasonCode: 'FUNDS_DEFICIENT',
      checks,
      attestationReportUrl: profile?.protections?.dailyAttestationReport
    };
  }

  if (!allowanceSufficient) {
    return {
      ready: true, // can proceed to approve
      status: 'NEEDS_ALLOWANCE',
      checks,
      attestationReportUrl: profile?.protections?.dailyAttestationReport
    };
  }

  return {
    ready: true,
    status: 'READY',
    checks,
    attestationReportUrl: profile?.protections?.dailyAttestationReport
  };
}
