"use client";
import React, { useMemo, useState } from "react";
import { DragPayload, BlockKind, ProviderType, MarketType } from "../types";

interface SidebarProps {
  onBinanceApiToggle?: (market: "spot" | "perp", enabled: boolean) => void;
}

export default function Sidebar({ onBinanceApiToggle }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({
    logic: false,
    action: false,
    stream: false,
  });

  // 스트리밍 데이터(가격 블록) 상태
  const [streamProvider, setStreamProvider] = useState<ProviderType>("binance");
  const [providerSelected, setProviderSelected] = useState(false);
  const [streamMarkets, setStreamMarkets] = useState<{
    spot: boolean;
    perp: boolean;
  }>({
    spot: false,
    perp: false,
  });
  const ASSETS = [
    { label: "BTC", value: "BTC" },
    { label: "ETH", value: "ETH" },
  ];

  function handleDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function renderStreamPriceBlock(market: MarketType, symbol: string) {
    const isSpot = market === "spot";
    const palette = isSpot
      ? { bg: "rgba(16, 185, 129, 0.08)", border: "var(--success)" }
      : { bg: "rgba(59, 130, 246, 0.08)", border: "var(--primary)" };
    return (
      <div
        key={`${market}-${symbol}`}
        className="block-item"
        draggable
        onDragStart={(e) =>
          handleDragStart(e, {
            action: "create",
            kind: "PRICE_REF",
            market,
            symbol,
            provider: streamProvider,
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
          {(streamProvider === "binance" ? "Binance" : "Upbit").toUpperCase()}{" "}
          가격 블록
        </div>
      </div>
    );
  }

  const categories = useMemo(
    () => [
      {
        id: "logic",
        title: "수식 · 로직",
        items: [
          { id: "gap", label: "현선갭(GAP) 공식", kind: "GAP" as BlockKind },
          {
            id: "cond-group",
            label: "조건문 그룹",
            kind: "CONDITION_GROUP" as BlockKind,
          },
        ],
      },
      {
        id: "action",
        title: "실행 · 액션",
        items: [
          { id: "action", label: "액션(Action)", kind: "ACTION" as BlockKind },
        ],
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter((it) => it.label.toLowerCase().includes(q)),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query]);

  return (
    <nav className="sidebar">
      <h3 className="sidebar-title">사이드바</h3>

      {/* 블록 검색 */}
      <div className="sidebar-section">
        <strong>블록 검색</strong>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색 (예: 현선갭)"
        />
      </div>

      {/* 스트리밍 데이터 (BTC/ETH) */}
      <div className="sidebar-section">
        <button
          className={`toggle-btn ${open["stream"] ? "active" : ""}`}
          onClick={() => setOpen((s) => ({ ...s, stream: !s.stream }))}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <span>스트리밍 데이터</span>
          <span aria-hidden>{open["stream"] ? "▾" : "▸"}</span>
        </button>
        {open["stream"] && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div>
              <strong>API 선택</strong>
              <div className="toggle-group" style={{ marginTop: 6 }}>
                {(["binance", "upbit"] as ProviderType[]).map((p) => (
                  <button
                    key={p}
                    className={`toggle-btn ${
                      providerSelected && streamProvider === p ? "active" : ""
                    }`}
                    onClick={() => {
                      setStreamProvider(p);
                      setProviderSelected(true);
                    }}
                  >
                    {p === "binance" ? "Binance API" : "Upbit API"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <strong>데이터 종류</strong>
              <div className="toggle-group" style={{ marginTop: 6 }}>
                <button
                  className={`toggle-btn ${streamMarkets.spot ? "active" : ""}`}
                  onClick={() =>
                    setStreamMarkets((s) =>
                      s.spot
                        ? { spot: false, perp: false }
                        : { spot: true, perp: false }
                    )
                  }
                >
                  현물
                </button>
                <button
                  className={`toggle-btn ${streamMarkets.perp ? "active" : ""}`}
                  onClick={() =>
                    setStreamMarkets((s) =>
                      s.perp
                        ? { spot: false, perp: false }
                        : { spot: false, perp: true }
                    )
                  }
                >
                  선물
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ASSETS.map((a) => (
                <div
                  key={a.value}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {streamMarkets.spot &&
                    renderStreamPriceBlock("spot", a.value)}
                  {streamMarkets.perp &&
                    renderStreamPriceBlock("perp", a.value)}
                </div>
              ))}
              {!streamMarkets.spot && !streamMarkets.perp && (
                <div
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                ></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 목록 */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 12,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          검색 결과가 없습니다
        </div>
      ) : (
        filtered.map((cat) => (
          <div className="sidebar-section" key={cat.id}>
            <button
              className={`toggle-btn ${open[cat.id] ? "active" : ""}`}
              onClick={() => setOpen((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span>{cat.title}</span>
              <span aria-hidden>{open[cat.id] ? "▾" : "▸"}</span>
            </button>
            {open[cat.id] && (
              <div style={{ marginTop: 10 }}>
                {cat.items.map((b) => (
                  <div
                    key={b.id}
                    className="block-item"
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, { action: "create", kind: b.kind })
                    }
                  >
                    {b.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </nav>
  );
}
