"use client";
import React from "react";
import { Block, ActionBlock } from "../types";
import { getActionLabel, formatTime } from "../lib/utils";

interface TradingMonitorProps {
  execution: {
    id: string;
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
  };
  blocks: Block[];
  onClose: () => void;
}

export default function TradingMonitor({
  execution,
  blocks,
  onClose,
}: TradingMonitorProps) {
  const [showAllLogs, setShowAllLogs] = React.useState(false);
  const actionBlocks = blocks.filter(
    (b) => b.kind === "ACTION" && execution.actionIds.includes(b.id)
  ) as ActionBlock[];

  // Default: existing card panel UI
  return (
    <div className="trading-monitor">
      <div className="monitor-header">
        <div className="monitor-title">트레이딩 실행 모니터링</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={() => setShowAllLogs(true)}
          >
            전체 로그
          </button>
          <button className="monitor-close" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div
        style={{
          marginBottom: 12,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        시작 시간: {formatTime(execution.startedAt)}
      </div>
      <div style={{ marginBottom: 12 }}>
        <span className={`monitor-status ${execution.status}`}>
          {execution.status === "pending" && "대기 중"}
          {execution.status === "executing" && "실행 중"}
          {execution.status === "completed" && "완료"}
          {execution.status === "failed" && "실패"}
        </span>
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {actionBlocks.map((actionBlock) => {
          const result = execution.results?.find(
            (r) => r.actionId === actionBlock.id
          );
          return (
            <div key={actionBlock.id} className="monitor-item">
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {actionBlock.actions.map(getActionLabel).join(", ")}
              </div>
              {result ? (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {result.success ? "✓" : "✗"} {result.message}
                  <br />
                  <span style={{ fontSize: 11 }}>
                    {formatTime(result.timestamp)}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  실행 중...
                </div>
              )}
            </div>
          );
        })}
      </div>
      {execution.completedAt && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          완료 시간: {formatTime(execution.completedAt)}
        </div>
      )}

      {/* All logs modal */}
      {showAllLogs && (
        <div className="modal-overlay" role="dialog" aria-modal>
          <div className="modal" style={{ maxWidth: 640, width: "90%" }}>
            <div className="modal-title">전체 실행 로그</div>
            <div className="modal-content" style={{ padding: 0 }}>
              <div
                style={{ maxHeight: "60vh", overflowY: "auto", padding: 16 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  상태: {execution.status === "pending" && "대기 중"}
                  {execution.status === "executing" && "실행 중"}
                  {execution.status === "completed" && "완료"}
                  {execution.status === "failed" && "실패"}
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                    시작: {formatTime(execution.startedAt)}
                  </div>
                </div>
                {actionBlocks.map((actionBlock) => {
                  const result = execution.results?.find(
                    (r) => r.actionId === actionBlock.id
                  );
                  return (
                    <div
                      key={actionBlock.id}
                      className="monitor-item"
                      style={{ marginBottom: 12 }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {actionBlock.actions.map(getActionLabel).join(", ")}
                      </div>
                      {result ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {result.success ? "✓" : "✗"} {result.message}
                          <br />
                          <span style={{ fontSize: 11 }}>
                            {formatTime(result.timestamp)}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          실행 중...
                        </div>
                      )}
                    </div>
                  );
                })}
                {execution.completedAt && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 8,
                    }}
                  >
                    완료 시간: {formatTime(execution.completedAt)}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowAllLogs(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
