"use client";

import React, { useMemo, useState } from "react";
import FormulaEditor from "./FormulaEditor";
import {
  Block,
  GapBlock,
  ConditionGroupBlock,
  ActionBlock,
  PriceRefBlock,
  ProviderType,
  MarketType,
} from "../types";
import { generateId } from "../lib/utils";

export default function StatisticsPanel() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [command, setCommand] = useState("");
  const showHints = command.trim().startsWith("/");

  function addBlocks(newOnes: Block[]) {
    if (!newOnes.length) return;
    setBlocks((prev) => [...prev, ...newOnes]);
  }

  function parseSlashCommand(text: string): Block[] {
    const t = text.trim();
    if (!t.startsWith("/")) return [];
    const raw = t.slice(1).trim();
    const parts = raw.split(/\s+/);
    const cmd = (parts[0] || "").toLowerCase();

    // /gap -> GAP 공식
    if (cmd === "gap" || cmd === "현선갭") {
      const b: GapBlock = {
        id: generateId(),
        kind: "GAP",
        refs: [],
        result: null,
      };
      return [b];
    }

    // /cond -> 조건문 그룹
    if (cmd === "cond" || cmd === "조건") {
      const b: ConditionGroupBlock = {
        id: generateId(),
        kind: "CONDITION_GROUP",
        conditions: [],
      };
      return [b];
    }

    // /action -> 액션 블록
    if (cmd === "action" || cmd === "액션") {
      const b: ActionBlock = { id: generateId(), kind: "ACTION", actions: [] };
      return [b];
    }

    // /price <spot|perp> <SYMBOL> [binance|upbit]
    if (cmd === "price" || cmd === "가격") {
      const market = (parts[1] || "").toLowerCase() as MarketType;
      const symbol = (parts[2] || "BTC").toUpperCase();
      const provider =
        ((parts[3] || "binance").toLowerCase() as ProviderType) || "binance";
      if (market !== "spot" && market !== "perp") return [];
      const b: PriceRefBlock = {
        id: generateId(),
        kind: "PRICE_REF",
        market,
        symbol,
        provider,
      };
      return [b];
    }

    return [];
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const created = parseSlashCommand(command);
      if (created.length > 0) {
        addBlocks(created);
        setCommand("");
      }
    } else if (e.key === "Escape") {
      setCommand("");
    }
  }

  const hintItems = useMemo(
    () => [
      {
        id: "gap",
        label: "현선갭(GAP) 공식",
        action: () =>
          addBlocks([
            {
              id: generateId(),
              kind: "GAP",
              refs: [],
              result: null,
            } as GapBlock,
          ]),
      },
      {
        id: "cond",
        label: "조건문 그룹",
        action: () =>
          addBlocks([
            {
              id: generateId(),
              kind: "CONDITION_GROUP",
              conditions: [],
            } as ConditionGroupBlock,
          ]),
      },
      {
        id: "action",
        label: "액션 블록",
        action: () =>
          addBlocks([
            { id: generateId(), kind: "ACTION", actions: [] } as ActionBlock,
          ]),
      },
      {
        id: "price-spot-btc",
        label: "가격 블록: Spot · BTC",
        action: () =>
          addBlocks([
            {
              id: generateId(),
              kind: "PRICE_REF",
              market: "spot" as MarketType,
              symbol: "BTC",
              provider: "binance",
            } as PriceRefBlock,
          ]),
      },
      {
        id: "price-perp-btc",
        label: "가격 블록: Perp · BTC",
        action: () =>
          addBlocks([
            {
              id: generateId(),
              kind: "PRICE_REF",
              market: "perp" as MarketType,
              symbol: "BTC",
              provider: "binance",
            } as PriceRefBlock,
          ]),
      },
    ],
    []
  );

  return (
    <div className="statistics-panel">
      <div className="statistics-panel-header">
        <div>
          <h3>Statistics</h3>
          <p>
            현선갭 공식을 끌어와 가격 블록을 배치하고 결과 블록을 만들어 빠르게
            검증하세요.
          </p>
          <div style={{ position: "relative", marginTop: 8 }}>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/ 입력으로 블록 추가 (예: /gap, /price spot BTC)"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
              }}
            />
            {showHints && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                  zIndex: 10,
                }}
              >
                {hintItems.map((h) => (
                  <button
                    key={h.id}
                    className="toggle-btn"
                    onClick={() => {
                      h.action();
                      setCommand("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      justifyContent: "flex-start",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      borderRadius: 0,
                    }}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="statistics-panel-body">
        <FormulaEditor
          title="Statistics"
          blocks={blocks}
          onBlocksChange={setBlocks}
          hideHeader
        />
      </div>
    </div>
  );
}
