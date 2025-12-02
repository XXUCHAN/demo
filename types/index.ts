// 블록 타입 정의
export type BlockKind =
  | "GAP"
  | "PRICE_REF"
  | "CONDITION"
  | "GAP_RESULT"
  | "ACTION"
  | "CONDITION_GROUP";

export type MarketType = "spot" | "perp";
export type ProviderType = "binance" | "upbit";
export type OperatorType = "≥" | "≤" | ">" | "<" | "==" | "!=";
export type ActionType =
  | "binance_buy_spot_max_long"
  | "binance_buy_perp_max_short"
  | "binance_sell_spot_max_long"
  | "binance_sell_perp_max_short";

export interface PriceRef {
  id: string;
  market: MarketType;
  symbol: string;
  provider?: ProviderType;
  price?: number;
  ts?: number;
}

export interface GapBlock {
  id: string;
  kind: "GAP";
  refs: PriceRef[];
  result?: number | null;
  x?: number;
  y?: number;
}

export interface PriceRefBlock {
  id: string;
  kind: "PRICE_REF";
  market: MarketType;
  symbol: string;
  provider?: ProviderType;
  price?: number;
  ts?: number;
  x?: number;
  y?: number;
}

export interface GapResultBlock {
  id: string;
  kind: "GAP_RESULT";
  gapId: string;
  value: number;
  ts?: number;
  inlineOnly?: boolean;
  x?: number;
  y?: number;
}

export interface ConditionBlock {
  id: string;
  kind: "CONDITION";
  left: number | null;
  op: OperatorType;
  rightRefId?: string; // GAP_RESULT 블록 ID 참조
  parentGroupId?: string; // 조건문 그룹에 속한 경우
  x?: number;
  y?: number;
}

export interface ConditionGroupBlock {
  id: string;
  kind: "CONDITION_GROUP";
  conditions: string[]; // ConditionBlock IDs
  nextActionId?: string; // 연결된 Action 블록 ID
  x?: number;
  y?: number;
}

export interface ActionBlock {
  id: string;
  kind: "ACTION";
  actions: ActionType[];
  prevConditionId?: string; // 이전 조건문 그룹 ID
  x?: number;
  y?: number;
}

export type Block =
  | GapBlock
  | PriceRefBlock
  | ConditionBlock
  | GapResultBlock
  | ConditionGroupBlock
  | ActionBlock;

export interface DragPayload {
  action: "create" | "move";
  kind: BlockKind;
  id?: string;
  market?: MarketType;
  symbol?: string;
  provider?: ProviderType;
  [key: string]: any;
}

export interface Strategy {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

export interface TradingExecution {
  id: string;
  strategyId: string;
  actionIds: string[];
  status: "pending" | "executing" | "completed" | "failed";
  results?: Array<{
    actionId: string;
    success: boolean;
    message: string;
    timestamp: number;
  }>;
  startedAt: number;
  completedAt?: number;
}
