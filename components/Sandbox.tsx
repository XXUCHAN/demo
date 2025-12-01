"use client";

import React, { useState } from "react";
import { DragPayload, MarketType, ProviderType } from "../types";

const ASSETS = [
  { label: "BTC", value: "BTC" },
  { label: "ETH", value: "ETH" },
];

export default function Sandbox() {
  const [activeMarkets, setActiveMarkets] = useState<{
    spot: boolean;
    perp: boolean;
  }>({
    spot: true,
    perp: true,
  });
  const [provider, setProvider] = useState<ProviderType>("binance");
  const [symbol, setSymbol] = useState("BTC");

  function handleDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function toggleMarket(k: MarketType) {
    setActiveMarkets((s) => ({ ...s, [k]: !s[k] }));
  }

  function renderPriceBlock(market: MarketType) {
    const isSpot = market === "spot";
    // 다크 테마 친화적인 틴트 색상 (테마 변수 기반)
    const palette = isSpot
      ? { bg: "rgba(16, 185, 129, 0.08)", border: "var(--success)" } // Spot: success 틴트
      : { bg: "rgba(59, 130, 246, 0.08)", border: "var(--primary)" }; // Perp: primary 틴트

    return (
      <div
        key={market}
        className="block-item"
        draggable
        onDragStart={(e) =>
          handleDragStart(e, {
            action: "create",
            kind: "PRICE_REF",
            market,
            symbol,
            provider,
          })
        }
        style={{
          background: palette.bg,
          borderColor: palette.border,
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {isSpot ? "Spot" : "Perp"} · {symbol}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 4,
          }}
        >
          {(provider === "binance" ? "Binance" : "Upbit").toUpperCase()} 가격
          블록
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sandbox</h3>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
        BTC/ETH 자산에 대해 Binance 또는 Upbit API를 선택해 현선 가격 블록을
        끌어다 사용할 수 있습니다.
      </p>

      <div className="sidebar-section" style={{ marginTop: 0 }}>
        <strong>API 선택</strong>
        <div className="toggle-group">
          {(["binance", "upbit"] as ProviderType[]).map((p) => (
            <button
              key={p}
              className={`toggle-btn ${provider === p ? "active" : ""}`}
              onClick={() => setProvider(p)}
            >
              {p === "binance" ? "Binance API" : "Upbit API"}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <strong>자산 선택</strong>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          {ASSETS.map((asset) => (
            <option key={asset.value} value={asset.value}>
              {asset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <strong>데이터 종류</strong>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${activeMarkets.spot ? "active" : ""}`}
            onClick={() => toggleMarket("spot")}
          >
            현물
          </button>
          <button
            className={`toggle-btn ${activeMarkets.perp ? "active" : ""}`}
            onClick={() => toggleMarket("perp")}
          >
            선물
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          overflow: "auto",
        }}
      >
        {activeMarkets.spot && renderPriceBlock("spot")}
        {activeMarkets.perp && renderPriceBlock("perp")}

        {!activeMarkets.spot && !activeMarkets.perp && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            데이터 종류를 활성화하면 가격 블록을 사용할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
