"use client";

import React, { useState } from "react";
import FormulaEditor from "./FormulaEditor";
import { Block } from "../types";

export default function StatisticsPanel() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  return (
    <div className="statistics-panel">
      <div className="statistics-panel-header">
        <div>
          <h3>Statistics</h3>
          <p>
            현선갭 공식을 끌어와 가격 블록을 배치하고 결과 블록을 만들어
            빠르게 검증하세요.
          </p>
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

