// 공통 유틸리티 함수들

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("ko-KR");
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    binance_buy_spot_max_long: "Binance Buy Spot Max Long",
    binance_buy_perp_max_short: "Binance Buy Perp Max Short",
    binance_sell_spot_max_long: "Binance Sell Spot Max Long",
    binance_sell_perp_max_short: "Binance Sell Perp Max Short",
  };
  return labels[action] || action;
}

export function getOperatorSymbol(op: string): string {
  return op;
}

