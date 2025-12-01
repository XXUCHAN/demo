"use client";
import React, { useState } from "react";
import { DragPayload, BlockKind } from "../types";

interface SidebarProps {
  onBinanceApiToggle?: (market: "spot" | "perp", enabled: boolean) => void;
}

export default function Sidebar({ onBinanceApiToggle }: SidebarProps) {
  const [activeMarkets, setActiveMarkets] = useState<{
    spot: boolean;
    perp: boolean;
  }>({
    spot: true,
    perp: false,
  });
  const [query, setQuery] = useState("");

  function handleDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function toggleMarket(market: "spot" | "perp") {
    const newState = { ...activeMarkets, [market]: !activeMarkets[market] };
    setActiveMarkets(newState);
    onBinanceApiToggle?.(market, newState[market]);
  }

  const availableBlocks = [
    { id: "gap", label: "현선갭(GAP) 공식", kind: "GAP" as BlockKind },
    {
      id: "cond-group",
      label: "조건문 그룹",
      kind: "CONDITION_GROUP" as BlockKind,
    },
    { id: "action", label: "액션(Action)", kind: "ACTION" as BlockKind },
  ];

  const filteredBlocks = availableBlocks.filter((b) =>
    b.label.toLowerCase().includes(query.toLowerCase())
  );

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

        <div style={{ marginTop: 10 }}>
          {filteredBlocks.length === 0 ? (
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
            filteredBlocks.map((b) => (
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
            ))
          )}
        </div>
      </div>
    </nav>
  );
}
