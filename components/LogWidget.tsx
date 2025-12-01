"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry } from "./LogViewer";

interface LogWidgetProps {
  entries: LogEntry[];
  position?: { bottom?: number; right?: number };
  isExecuting?: boolean;
  onStop?: () => void;
}

export default function LogWidget({
  entries,
  position,
  isExecuting,
  onStop,
}: LogWidgetProps) {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const posStyle = useMemo(
    () => ({
      bottom: `${position?.bottom ?? 84}px`, // default above other FABs
      right: `${position?.right ?? 20}px`,
    }),
    [position]
  );

  const unread = entries.filter((e) => e.timestamp > lastSeenAt).length;

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        fabRef.current &&
        !fabRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // mark as seen when opening
  useEffect(() => {
    if (open && entries.length > 0) {
      setLastSeenAt(Date.now());
    }
  }, [open, entries.length]);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="chat-fab"
        style={{ bottom: position?.bottom ?? 20, right: position?.right ?? 84 }}
        aria-label="Open logs"
        onClick={() => setOpen((v) => !v)}
        title="전체 로그"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5h18M3 12h18M3 19h18"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 9,
              background: "#ef4444",
              color: "#fff",
              fontSize: 11,
              lineHeight: "18px",
              textAlign: "center",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="chat-panel" style={posStyle} ref={panelRef}>
          <div
            className="chat-panel-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="chat-panel-title">실행 로그</div>
            <button
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="chat-panel-body" style={{ maxHeight: "66vh" }}>
            {entries.length === 0 ? (
              <div className="chat-empty">아직 로그가 없습니다.</div>
            ) : (
              entries
                .slice()
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((e) => (
                  <div key={e.id} className="chat-msg agent">
                    <div
                      className={`bubble ${
                        e.status === "success"
                          ? "success"
                          : e.status === "failed"
                          ? "failed"
                          : e.status
                      }`}
                    >
                      {/* Korean status label and inline stop when executing */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {e.status === "executing" && (
                          <span
                            aria-label="loading"
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              border: "2px solid var(--border)",
                              borderTopColor: "var(--primary)",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        )}
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--surface-elev)",
                            fontWeight: 600,
                            color:
                              e.status === "executing"
                                ? "var(--primary)"
                                : e.status === "pending"
                                ? "var(--text-secondary)"
                                : "var(--text-primary)",
                          }}
                        >
                          {e.status === "pending"
                            ? "대기 중"
                            : e.status === "executing"
                            ? "실행중"
                            : "종료"}
                        </span>
                        {e.status === "executing" && onStop && (
                          <button
                            className="btn-danger"
                            onClick={onStop}
                            style={{ padding: "2px 6px", fontSize: 11 }}
                          >
                            실행 종료
                          </button>
                        )}
                      </div>
                      {e.title && (
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {e.title}
                        </div>
                      )}
                      <div>{e.message}</div>
                      {/* metrics: always show */}
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {(() => {
                          const pnl = e.pnl ?? 0;
                          return (
                            <span
                              style={{
                                color:
                                  pnl >= 0 ? "var(--success)" : "var(--danger)",
                                fontWeight: 600,
                              }}
                            >
                              PNL: {pnl >= 0 ? "+" : ""}
                              {Math.abs(pnl).toLocaleString()}
                            </span>
                          );
                        })()}
                        {(() => {
                          const capital = e.capital ?? 0;
                          const roi =
                            e.roiPercent != null
                              ? e.roiPercent
                              : capital !== 0
                              ? ((e.pnl ?? 0) / capital) * 100
                              : 0;
                          return (
                            <span
                              style={{
                                color:
                                  roi >= 0 ? "var(--success)" : "var(--danger)",
                                fontWeight: 600,
                              }}
                            >
                              수익률: {roi >= 0 ? "+" : ""}
                              {roi.toFixed(2)}%
                            </span>
                          );
                        })()}
                        <span style={{ color: "var(--text-secondary)" }}>
                          원금: {(e.capital ?? 0).toLocaleString()}
                        </span>
                      </div>
                      {e.actions && e.actions.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12 }}>
                          <div
                            style={{
                              color: "var(--text-secondary)",
                              marginBottom: 4,
                            }}
                          >
                            선택한 액션
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {e.actions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                        {new Date(e.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
      {/* spinner keyframes */}
      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
    </>
  );
}
