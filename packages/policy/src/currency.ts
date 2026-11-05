import { RiskTier, ToolManifestEntry } from './types.js';

export interface CurrencyAmount {
  amount: number;
  currency: string;
  isEstimated: boolean;
  exchangeRate?: number;
  exchangeRateSource?: string;
}

export interface CurrencyContext {
  chargedCurrency: string;
  userCurrency: string;
  exchangeRate: number;
  exchangeRateTimestamp: Date;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): CurrencyAmount {
  const converted = amount * exchangeRate;
  
  return {
    amount: converted,
    currency: toCurrency,
    isEstimated: true,
    exchangeRate,
    exchangeRateSource: 'daily_rate',
  };
}

export function formatCurrency(amount: number, currency: string, isEstimated = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  if (isEstimated) {
    return `${formatted} (estimated)`;
  }
  
  return formatted;
}

export function showWithEstimated(context: CurrencyContext, amount: number): string {
  const charged = convertCurrency(amount, 'USD', context.chargedCurrency, 1);
  const user = convertCurrency(amount, 'USD', context.userCurrency, context.exchangeRate);
  
  return `${formatCurrency(charged.amount, charged.currency)} / ${formatCurrency(user.amount, user.currency, user.isEstimated)}`;
}

export function estimateUserCost(costUsd: number, exchangeRate: number): number {
  return costUsd * exchangeRate;
}

export function createCurrencyContext(
  chargedCurrency = 'USD',
  userCurrency = 'USD',
  exchangeRate = 1
): CurrencyContext {
  return {
    chargedCurrency,
    userCurrency,
    exchangeRate,
    exchangeRateTimestamp: new Date(),
  };
}

export interface RiskTierCost {
  tier: RiskTier;
  baseCost: number;
  description: string;
}

export const DEFAULT_RISK_TIER_COSTS: Record<RiskTier, RiskTierCost> = {
  0: {
    tier: 0,
    baseCost: 0,
    description: 'Read-only operations',
  },
  1: {
    tier: 1,
    baseCost: 0.01,
    description: 'Draft/creation operations',
  },
  2: {
    tier: 2,
    baseCost: 0.1,
    description: 'Reversible changes',
  },
  3: {
    tier: 3,
    baseCost: 1.0,
    description: 'Consequential actions',
  },
};

export function getCostEstimate(tier: RiskTier, manifest: readonly ToolManifestEntry[]): number {
  const entry = manifest.find((t) => t.tier === tier);
  if (entry && entry.arguments?.costEstimate) {
    return Number(entry.arguments.costEstimate);
  }
  return DEFAULT_RISK_TIER_COSTS[tier].baseCost;
}

export function calculateTotalCost(
  costs: number[],
  exchangeRate: number,
  chargedCurrency = 'USD',
  userCurrency = 'USD'
): { charged: CurrencyAmount; user: CurrencyAmount } {
  const totalCharged = costs.reduce((sum, c) => sum + c, 0);
  const totalUser = totalCharged * exchangeRate;
  
  return {
    charged: {
      amount: totalCharged,
      currency: chargedCurrency,
      isEstimated: false,
    },
    user: {
      amount: totalUser,
      currency: userCurrency,
      isEstimated: true,
    },
  };
}

export interface ExchangeRateService {
  getRate(from: string, to: string): number;
  getCachedRate(from: string, to: string): number | null;
}

export class SimpleExchangeRateService implements ExchangeRateService {
  private rates: Map<string, number> = new Map();
  
  constructor(private defaultRate = 1) {}
  
  getRate(from: string, to: string): number {
    if (from === to) return 1;
    
    const key = `${from}-${to}`;
    return this.rates.get(key) ?? this.defaultRate;
  }
  
  getCachedRate(from: string, to: string): number | null {
    if (from === to) return 1;
    
    const key = `${from}-${to}`;
    return this.rates.get(key) ?? null;
  }
  
  setRate(from: string, to: string, rate: number): void {
    const key = `${from}-${to}`;
    this.rates.set(key, rate);
  }
}
