"use client";
import React, { useState } from "react";
import FormulaEditor from "../components/FormulaEditor";
import { Strategy } from "../types";
import { generateId } from "../lib/utils";
import type { LogEntry } from "../components/LogViewer";
import dynamic from "next/dynamic";
const LogWidget = dynamic(() => import("../components/LogWidget"), {
  ssr: false,
});

const HomePage = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: generateId(),
      name: "새 전략 1",
      blocks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  const [activeStrategyId, setActiveStrategyId] = useState<string>(
    strategies[0]?.id || ""
  );

  const activeStrategy = strategies.find((s) => s.id === activeStrategyId);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // receive stop function from FormulaEditor to cancel execution
  const stopRef = React.useRef<(() => void) | null>(null);

  const appendLog = (entry: LogEntry) => {
    setLogs((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
  };

  const handleNewStrategy = () => {
    const newStrategy: Strategy = {
      id: generateId(),
      name: `새 전략 ${strategies.length + 1}`,
      blocks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStrategies([...strategies, newStrategy]);
    setActiveStrategyId(newStrategy.id);
  };

  const handleUpdateStrategy = (blocks: Strategy["blocks"]) => {
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === activeStrategyId ? { ...s, blocks, updatedAt: Date.now() } : s
      )
    );
  };

  // derive executing state from logs (simple heuristic)
  const isExecuting = React.useMemo(() => {
    if (logs.length === 0) return false;
    const last = logs[logs.length - 1];
    return last.status === "executing";
  }, [logs]);

  const handleStop = () => {
    // call registered stop to actually cancel execution; fallback to appending a log if not available
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: generateId(),
          title: "실행 중지",
          message: "사용자에 의해 실행이 중지되었습니다",
          status: "failed",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  return (
    <div className="workspace-root">
      <div className="workspace-header">
        <div className="strategy-tabs">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              className={`strategy-tab ${
                activeStrategyId === strategy.id ? "active" : ""
              }`}
              onClick={() => setActiveStrategyId(strategy.id)}
            >
              {strategy.name}
              {activeStrategyId === strategy.id && (
                <span className="tab-indicator" />
              )}
            </button>
          ))}
          <button className="strategy-tab new-tab" onClick={handleNewStrategy}>
            + 새 전략
          </button>
        </div>
        <div className="workspace-actions">
          <button className="btn-secondary">불러오기</button>
        </div>
      </div>

      {activeStrategy && (
        <div className="workspace-content">
          <FormulaEditor
            key={activeStrategy.id}
            title={activeStrategy.name}
            blocks={activeStrategy.blocks}
            onBlocksChange={handleUpdateStrategy}
            onLogEvent={appendLog}
            onRegisterStop={(fn) => {
              stopRef.current = fn;
            }}
          />
        </div>
      )}

      <LogWidget
        entries={logs}
        position={{ bottom: 32, right: 24 }}
        isExecuting={isExecuting}
        onStop={isExecuting ? handleStop : undefined}
      />
    </div>
  );
};

export default HomePage;
