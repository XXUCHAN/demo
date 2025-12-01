"use client";
import React from "react";

export type LogStatus = "pending" | "executing" | "success" | "failed";
export interface LogEntry {
  id: string;
  title?: string;
  message: string;
  status: LogStatus;
  timestamp: number;
  // Optional trading metrics
  pnl?: number; // absolute PnL (e.g., in USDT)
  capital?: number; // initial capital for ROI calculation
  roiPercent?: number; // if provided, overrides computed (pnl/capital*100)
  // Selected actions (human-readable labels)
  actions?: string[];
}

interface LogViewerProps {
  open: boolean;
  entries: LogEntry[];
  onClose: () => void;
  // Execution control (optional)
  isExecuting?: boolean;
  onStop?: () => void;
}

export default function LogViewer({
  open,
  entries,
  onClose,
  isExecuting,
  onStop,
}: LogViewerProps) {
  if (!open) return null;

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // close when clicking outside modal content
    if (e.target === e.currentTarget) onClose();
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal
      onClick={onOverlayClick}
    >
      <div className="modal" style={{ maxWidth: 720, width: "92%" }}>
        <div
          className="modal-title"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>전체 실행 로그</span>
          {isExecuting && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span
                  aria-label="loading"
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid var(--border)",
                    borderTopColor: "var(--primary)",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  진행 중…
                </span>
              </div>
              {onStop && (
                <button
                  className="btn-danger"
                  onClick={onStop}
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  중지
                </button>
              )}
            </div>
          )}
        </div>
        <div className="modal-content" style={{ padding: 0 }}>
          <div className="chat-panel-body" style={{ maxHeight: "65vh" }}>
            {entries.length === 0 ? (
              <div className="chat-empty">아직 로그가 없습니다.</div>
            ) : (
              entries
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
                      {e.title && (
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {e.title}
                        </div>
                      )}
                      <div>{e.message}</div>
                      {(e.pnl != null ||
                        e.roiPercent != null ||
                        e.capital != null) && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          {e.pnl != null && (
                            <span
                              style={{
                                color:
                                  e.pnl >= 0
                                    ? "var(--success)"
                                    : "var(--danger)",
                                fontWeight: 600,
                              }}
                            >
                              PNL: {e.pnl >= 0 ? "+" : ""}
                              {Math.abs(e.pnl).toLocaleString()}
                            </span>
                          )}
                          {(() => {
                            const roi =
                              e.roiPercent != null
                                ? e.roiPercent
                                : e.pnl != null && e.capital
                                ? (e.pnl / e.capital) * 100
                                : undefined;
                            if (roi == null) return null;
                            return (
                              <span
                                style={{
                                  color:
                                    roi >= 0
                                      ? "var(--success)"
                                      : "var(--danger)",
                                  fontWeight: 600,
                                }}
                              >
                                수익률: {roi >= 0 ? "+" : ""}
                                {roi.toFixed(2)}%
                              </span>
                            );
                          })()}
                          {e.capital != null && (
                            <span style={{ color: "var(--text-secondary)" }}>
                              원금: {e.capital.toLocaleString()}
                            </span>
                          )}
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
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
      {/* spinner keyframes */}
      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}
