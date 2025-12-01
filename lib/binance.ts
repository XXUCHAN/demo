import { MarketType, ProviderType } from "../types";

const BASE_PRICES: Record<ProviderType, Record<string, number>> = {
  binance: {
    BTCUSDT: 45000,
    ETHUSDT: 2600,
  },
  upbit: {
    BTCUSDT: 45120,
    ETHUSDT: 2625,
  },
};

export async function fetchMockPrice(
  market: MarketType,
  symbol = "BTCUSDT",
  provider: ProviderType = "binance"
) {
  const providerBase = BASE_PRICES[provider] || BASE_PRICES.binance;
  const base = providerBase[symbol] ?? 100;
  const perpPremium = market === "perp" ? 50 : 0;
  const driftRange = provider === "binance" ? 120 : 80;
  const drift = (Math.random() - 0.5) * (market === "perp" ? driftRange * 2 : driftRange);
  const price = Math.round((base + perpPremium + drift) * 100) / 100;
  return { market, symbol, provider, price, ts: Date.now() };
}
