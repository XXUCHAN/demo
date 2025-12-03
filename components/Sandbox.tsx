"use client";
import React, { useState } from "react";
import { DragPayload, MarketType, ProviderType } from "../types";

export default function Sandbox() {
  const [apiType, setApiType] = useState<"basic" | "custom">("basic");
  const [provider, setProvider] = useState<ProviderType | undefined>(undefined);
  const [symbol, setSymbol] = useState("BTC");
  const [activeMarkets, setActiveMarkets] = useState<{
    spot: boolean;
    perp: boolean;
  }>({
    spot: false,
    perp: false,
  });

  const [providerInput, setProviderInput] = useState("");
  const [showProviderHints, setShowProviderHints] = useState(false);
  const [transport, setTransport] = useState<"websocket" | "rest">("websocket");
  const [intervalSec, setIntervalSec] = useState<number>(0);
  const [blockColor, setBlockColor] = useState<string>("#3b82f6");

  // 선택 상태를 기반으로 동적 placeholder 생성
  const computedPlaceholder = (() => {
    const prov = provider
      ? provider === "binance"
        ? "binance"
        : "upbit"
      : "binance";
    const market = activeMarkets.spot
      ? "spot"
      : activeMarkets.perp
      ? "perp"
      : "";
    if (!market) return "예: /binance spot price, /upbit perp price";
    return `/${prov} ${market} price`;
  })();

  function handleDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function applySlashSelection(hint: string) {
    const h = hint.toLowerCase();
    if (h.includes("binance")) setProvider("binance");
    if (h.includes("upbit")) setProvider("upbit");
    if (h.includes("spot")) setActiveMarkets({ spot: true, perp: false });
    if (h.includes("perp")) setActiveMarkets({ spot: false, perp: true });
    // 선택 후 입력값 초기화 및 힌트 닫기
    setProviderInput("");
    setShowProviderHints(false);
  }

  function renderPriceBlock(market: MarketType) {
    const isSpot = market === "spot";
    function hexToRgba(hex: string, alpha: number) {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const chosenBorder = blockColor;
    const chosenBg = hexToRgba(blockColor, 0.08);
    const palette = { bg: chosenBg, border: chosenBorder };

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
            transport,
            intervalSec,
            color: blockColor,
          })
        }
        style={{ background: palette.bg, borderColor: palette.border }}
      >
        <div style={{ fontWeight: 600 }}>
          {isSpot ? "Spot" : "Perp"} · {symbol}
        </div>
        <div
          style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}
        >
          {(provider
            ? provider === "binance"
              ? "Binance"
              : "Upbit"
            : "-"
          ).toUpperCase()}{" "}
          가격 블록
        </div>
        <div
          style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}
        >
          {transport.toUpperCase()} · {intervalSec}s · 색상 {blockColor}
        </div>
      </div>
    );
  }

  const slashHints = [
    "/binance spot price",
    "/binance perp price",
    "/upbit spot price",
    "/upbit perp price",
  ];

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
      <div className="sidebar-section" style={{ marginTop: 0 }}>
        <strong>API 유형</strong>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${apiType === "basic" ? "active" : ""}`}
            onClick={() => setApiType("basic")}
          >
            Basic API
          </button>
          <button
            className={`toggle-btn ${apiType === "custom" ? "active" : ""}`}
            onClick={() => setApiType("custom")}
          >
            Custom API
          </button>
        </div>
      </div>

      {apiType === "basic" && (
        <div className="sidebar-section">
          <strong>Basic 소스 선택</strong>
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder={computedPlaceholder}
              value={providerInput}
              onChange={(e) => setProviderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = providerInput.trim().toLowerCase();
                  const match = slashHints.find((h) => h.includes(q));
                  if (match) applySlashSelection(match);
                }
                if (e.key === "Escape") setShowProviderHints(false);
              }}
              onFocus={() => setShowProviderHints(true)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            {showProviderHints && providerInput.startsWith("/") && (
              <div
                style={{
                  marginTop: 6,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--panel)",
                  overflow: "hidden",
                }}
              >
                {slashHints
                  .filter((s) => s.includes(providerInput.toLowerCase()))
                  .map((hint) => (
                    <div
                      key={hint}
                      onMouseDown={() => {
                        applySlashSelection(hint);
                        setShowProviderHints(false);
                      }}
                      style={{
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {hint}
                    </div>
                  ))}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 6,
              }}
            >
              선택됨:{" "}
              {provider ? (provider === "binance" ? "Binance" : "Upbit") : "-"}{" "}
              ·{" "}
              {activeMarkets.spot ? "Spot" : activeMarkets.perp ? "Perp" : "-"}
            </div>
          </div>
        </div>
      )}

      {apiType === "custom" && (
        <div className="sidebar-section">
          <strong>Custom API</strong>
          <div
            style={{
              padding: 12,
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            추후 제공 예정입니다. 현재는 Basic API(바이낸스/업비트)만 사용
            가능합니다.
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          overflow: "auto",
        }}
      >
        {apiType === "basic" && activeMarkets.spot && renderPriceBlock("spot")}
        {apiType === "basic" && activeMarkets.perp && renderPriceBlock("perp")}

        {apiType === "basic" && (activeMarkets.spot || activeMarkets.perp) && (
          <div className="sidebar-section" style={{ marginTop: 8 }}>
            <strong style={{ fontSize: 13 }}>블록 속성</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginTop: 8,
                alignItems: "start",
                justifyItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  연결 방식
                </div>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${
                      transport === "websocket" ? "active" : ""
                    }`}
                    onClick={() => setTransport("websocket")}
                  >
                    WebSocket
                  </button>
                  <button
                    className={`toggle-btn ${
                      transport === "rest" ? "active" : ""
                    }`}
                    onClick={() => setTransport("rest")}
                  >
                    REST
                  </button>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  주기(초)
                </div>
                <input
                  type="number"
                  min={0}
                  value={intervalSec}
                  onChange={(e) =>
                    setIntervalSec(Math.max(0, Number(e.target.value) || 0))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  블록 색상
                </div>
                <input
                  type="color"
                  value={blockColor}
                  onChange={(e) => setBlockColor(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: 0,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
