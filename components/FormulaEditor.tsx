"use client";
import React, { useState, useRef, useEffect } from "react";
import { fetchMockPrice } from "../lib/binance";
import {
  Block,
  GapBlock,
  PriceRefBlock,
  ConditionBlock,
  GapResultBlock,
  ConditionGroupBlock,
  ActionBlock,
  DragPayload,
  OperatorType,
  ActionType,
  ProviderType,
  MarketType,
} from "../types";
import { generateId, getActionLabel } from "../lib/utils";
import ConfirmModal from "./ConfirmModal";
import type { LogEntry } from "./LogViewer";
// TradingMonitor는 실행 버튼 후 자동 표시하지 않음

interface FormulaEditorProps {
  title: string;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  hideHeader?: boolean;
  onLogEvent?: (entry: LogEntry) => void;
  // 상위에서 중지 버튼을 제공하기 위해 실행 중단 함수를 등록
  onRegisterStop?: (stopFn: () => void) => void;
}

export default function FormulaEditor({
  title,
  blocks,
  onBlocksChange,
  hideHeader = false,
  onLogEvent,
  onRegisterStop,
}: FormulaEditorProps) {
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    blockIds: string[];
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  // 실행 결과는 위젯/로그로만 확인. 모니터 패널은 자동 표시하지 않음.
  const canvasRef = useRef<HTMLDivElement>(null);
  const multiSelectRef = useRef<{ startX: number; startY: number } | null>(
    null
  );
  // 액션 블록별 선택된 액션 타입 임시 상태
  const [actionSelections, setActionSelections] = useState<
    Record<string, ActionType | "">
  >({});

  // 캔버스 내 블록 드래그 이동 상태
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function getCanvasCoords(e: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left + (canvas?.scrollLeft || 0) : 0;
    const y = rect ? e.clientY - rect.top + (canvas?.scrollTop || 0) : 0;
    return { x, y };
  }

  function shouldIgnoreDragStart(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      tag === "BUTTON"
    )
      return true;
    // 내부에서 자체 드래그를 사용하는 요소(PRICE_REF, GAP_RESULT 등)
    if (target.getAttribute("draggable") === "true") return true;
    // 상위까지 검사
    let el: HTMLElement | null = target;
    while (el) {
      if (el.getAttribute && el.getAttribute("draggable") === "true")
        return true;
      if (
        el.tagName === "BUTTON" ||
        el.tagName === "SELECT" ||
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA"
      )
        return true;
      el = el.parentElement;
    }
    return false;
  }

  function onBlockMouseDown(e: React.MouseEvent, blockId: string) {
    if (e.button !== 0) return; // 좌클릭만
    if (shouldIgnoreDragStart(e.target)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 현재 블록의 화면상 위치를 계산하여 오프셋 산출
    const canvasRect = canvas.getBoundingClientRect();
    const targetRect = (
      e.currentTarget as HTMLDivElement
    ).getBoundingClientRect();
    const currentX =
      targetRect.left - canvasRect.left + (canvas.scrollLeft || 0);
    const currentY = targetRect.top - canvasRect.top + (canvas.scrollTop || 0);
    const { x: mouseX, y: mouseY } = getCanvasCoords(e);
    dragOffsetRef.current = { x: mouseX - currentX, y: mouseY - currentY };
    setDraggingId(blockId);
    // 드래그 중 텍스트 선택 방지
    e.preventDefault();
  }

  // 전역 마우스 이동/업 리스너로 좌표 업데이트
  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (!draggingId) return;
      const { x: mouseX, y: mouseY } = getCanvasCoords(ev);
      const nx = Math.max(0, mouseX - dragOffsetRef.current.x);
      const ny = Math.max(0, mouseY - dragOffsetRef.current.y);
      onBlocksChange(
        blocks.map((b) => (b.id === draggingId ? { ...b, x: nx, y: ny } : b))
      );
    }
    function onUp() {
      if (draggingId) setDraggingId(null);
    }
    if (draggingId) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }
  }, [draggingId, blocks, onBlocksChange]);

  // 블록 삭제
  function deleteBlock(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    let newBlocks = blocks.filter((b) => b.id !== id);

    // GAP 삭제 시 관련 GAP_RESULT도 삭제
    if (block.kind === "GAP") {
      newBlocks = newBlocks.filter(
        (b) => !(b.kind === "GAP_RESULT" && b.gapId === id)
      );
    }

    // CONDITION_GROUP 삭제 시 관련 블록들 정리
    if (block.kind === "CONDITION_GROUP") {
      newBlocks = newBlocks.filter((b) => {
        if (b.kind === "CONDITION" && b.parentGroupId === id) return false;
        if (b.kind === "ACTION" && b.prevConditionId === id) return false;
        return true;
      });
    }

    onBlocksChange(newBlocks);
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // GAP 결과 계산
  function ensureGapResultForGap(gapId: string, baseBlocks: Block[] = blocks) {
    const gap = baseBlocks.find((b) => b.kind === "GAP" && b.id === gapId) as
      | GapBlock
      | undefined;
    if (!gap) {
      if (baseBlocks !== blocks) {
        onBlocksChange(baseBlocks);
      }
      return;
    }

    const spotRef = gap.refs.find((r) => r.market === "spot");
    const perpRef = gap.refs.find((r) => r.market === "perp");
    const result =
      spotRef && perpRef
        ? Math.round((spotRef.price! - perpRef.price!) * 100) / 100
        : null;

    let workingBlocks = baseBlocks.filter(
      (b) => !(b.kind === "GAP_RESULT" && b.gapId === gapId)
    );

    if (result != null) {
      const resultBlock: GapResultBlock = {
        id: "result-" + gapId,
        kind: "GAP_RESULT",
        gapId,
        value: result,
        ts: Date.now(),
      };
      workingBlocks = workingBlocks.map((b) =>
        b.kind === "GAP" && b.id === gapId ? { ...b, result } : b
      );
      workingBlocks.push(resultBlock);
    } else {
      workingBlocks = workingBlocks.map((b) =>
        b.kind === "GAP" && b.id === gapId ? { ...b, result: null } : b
      );
    }

    onBlocksChange(workingBlocks);
  }

  // 캔버스에 드롭
  async function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left + (canvas?.scrollLeft || 0) : 0;
    const y = rect ? e.clientY - rect.top + (canvas?.scrollTop || 0) : 0;
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload: DragPayload = JSON.parse(raw);

      if (payload.action === "move" && payload.kind === "GAP_RESULT") {
        // GAP_RESULT 이동 처리
        const existing = blocks.find((b) => b.id === payload.id);
        if (existing) {
          // 같은 에디터 내 이동: 위치 업데이트
          const updated = blocks.map((b) =>
            b.id === payload.id && b.kind === "GAP_RESULT"
              ? { ...(b as GapResultBlock), x, y }
              : b
          );
          onBlocksChange(updated);
        } else {
          // 다른 에디터에서 복사
          const newBlock: GapResultBlock = {
            id: generateId(),
            kind: "GAP_RESULT",
            gapId: payload.gapId || "",
            value: payload.value || 0,
            ts: payload.ts || Date.now(),
            x,
            y,
          };
          onBlocksChange([...blocks, newBlock]);
        }
        return;
      }

      if (payload.action !== "create") return;

      const id = generateId();

      if (payload.kind === "GAP") {
        const newBlock: GapBlock = {
          id,
          kind: "GAP",
          refs: [],
          result: null,
          x,
          y,
        };
        onBlocksChange([...blocks, newBlock]);
      } else if (payload.kind === "PRICE_REF") {
        const provider: ProviderType = payload.provider || "binance";
        const p = await fetchMockPrice(
          payload.market,
          payload.symbol,
          provider
        );
        const newBlock: PriceRefBlock = {
          id,
          kind: "PRICE_REF",
          market: payload.market,
          symbol: payload.symbol,
          provider,
          price: p.price,
          ts: p.ts,
          x,
          y,
        };
        onBlocksChange([...blocks, newBlock]);
      } else if (payload.kind === "CONDITION") {
        const newBlock: ConditionBlock = {
          id,
          kind: "CONDITION",
          left: null,
          op: "≥",
          x,
          y,
        };
        onBlocksChange([...blocks, newBlock]);
      } else if (payload.kind === "CONDITION_GROUP") {
        const newBlock: ConditionGroupBlock = {
          id,
          kind: "CONDITION_GROUP",
          conditions: [],
          x,
          y,
        };
        onBlocksChange([...blocks, newBlock]);
      } else if (payload.kind === "ACTION") {
        // Binance 액션은 블록이 아님: 액션 타입을 가진 드롭은 캔버스에서 무시하고,
        // Action 블록 내부 onActionDrop에서만 처리한다.
        if (payload.actionType) {
          return; // 캔버스에는 생성하지 않음
        }
        // 빈 Action 블록만 생성 가능
        const newBlock: ActionBlock = {
          id,
          kind: "ACTION",
          actions: [],
          x,
          y,
        };
        onBlocksChange([...blocks, newBlock]);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  }

  // GAP 블록에 드롭
  async function onGapDrop(e: React.DragEvent, gapId: string) {
    e.stopPropagation();
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload: DragPayload = JSON.parse(raw);

      if (payload.action === "move" && payload.kind === "GAP_RESULT") {
        // GAP_RESULT를 GAP에 연결
        const newBlocks = blocks.map((b) => {
          if (b.kind === "GAP_RESULT" && b.id === payload.id) {
            return { ...b, gapId, ts: Date.now() };
          }
          return b;
        });
        ensureGapResultForGap(gapId, newBlocks);
        return;
      }

      if (payload.kind === "PRICE_REF") {
        if (payload.action === "move" && payload.id) {
          const priceBlock = blocks.find(
            (b) => b.id === payload.id && b.kind === "PRICE_REF"
          ) as PriceRefBlock | undefined;
          if (priceBlock) {
            const newBlocks = blocks.map((b) => {
              if (b.kind === "GAP" && b.id === gapId) {
                const newRefs = [
                  ...b.refs,
                  {
                    id: generateId(),
                    market: priceBlock.market,
                    symbol: priceBlock.symbol,
                    provider: priceBlock.provider,
                    price: priceBlock.price,
                    ts: priceBlock.ts,
                  },
                ].slice(-2);
                return { ...b, refs: newRefs };
              }
              return b;
            });
            ensureGapResultForGap(gapId, newBlocks);
          }
          return;
        }

        if (payload.action !== "create") return;

        const provider: ProviderType = payload.provider || "binance";
        const p = await fetchMockPrice(
          payload.market,
          payload.symbol,
          provider
        );
        const newBlocks = blocks.map((b) => {
          if (b.kind === "GAP" && b.id === gapId) {
            const newRefs = [
              ...b.refs,
              {
                id: generateId(),
                market: payload.market,
                symbol: payload.symbol,
                provider,
                price: p.price,
                ts: p.ts,
              },
            ].slice(-2); // 최대 2개만 유지
            return { ...b, refs: newRefs };
          }
          return b;
        });
        ensureGapResultForGap(gapId, newBlocks);
        return;
      }
    } catch (err) {
      console.error("Gap drop error:", err);
    }
  }

  // GAP 블록에 드롭 (역할 지정: spot=분자, perp=분모)
  async function onGapDropToMarket(
    e: React.DragEvent,
    gapId: string,
    targetMarket: MarketType
  ) {
    e.stopPropagation();
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload: DragPayload = JSON.parse(raw);

      if (payload.kind === "PRICE_REF") {
        // market이 일치하지 않으면 무시
        if (payload.market && payload.market !== targetMarket) return;

        if (payload.action === "move" && payload.id) {
          const priceBlock = blocks.find(
            (b) => b.id === payload.id && b.kind === "PRICE_REF"
          ) as PriceRefBlock | undefined;
          if (priceBlock) {
            const newBlocks = blocks.map((b) => {
              if (b.kind === "GAP" && b.id === gapId) {
                const others = b.refs.filter((r) => r.market !== targetMarket);
                const newRef = {
                  id: generateId(),
                  market: priceBlock.market,
                  symbol: priceBlock.symbol,
                  provider: priceBlock.provider,
                  price: priceBlock.price,
                  ts: priceBlock.ts,
                };
                return { ...b, refs: [...others, newRef] };
              }
              return b;
            });
            ensureGapResultForGap(gapId, newBlocks);
          }
          return;
        }

        if (payload.action !== "create") return;

        const provider: ProviderType = payload.provider || "binance";
        const p = await fetchMockPrice(targetMarket, payload.symbol, provider);
        const newBlocks = blocks.map((b) => {
          if (b.kind === "GAP" && b.id === gapId) {
            const others = b.refs.filter((r) => r.market !== targetMarket);
            const newRef = {
              id: generateId(),
              market: targetMarket,
              symbol: payload.symbol,
              provider,
              price: p.price,
              ts: p.ts,
            };
            return { ...b, refs: [...others, newRef] };
          }
          return b;
        });
        ensureGapResultForGap(gapId, newBlocks);
        return;
      }
    } catch (err) {
      console.error("Gap drop (market) error:", err);
    }
  }

  // 조건문 블록에 값 설정
  function updateCondition(
    id: string,
    updates: Partial<Pick<ConditionBlock, "left" | "op" | "rightRefId">>
  ) {
    const newBlocks = blocks.map((b) =>
      b.kind === "CONDITION" && b.id === id ? { ...b, ...updates } : b
    );
    onBlocksChange(newBlocks);
  }

  // 조건문에 GAP_RESULT 드롭
  function onConditionDrop(e: React.DragEvent, conditionId: string) {
    e.stopPropagation();
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload: DragPayload = JSON.parse(raw);
      if (payload.kind === "GAP_RESULT") {
        let workingBlocks = blocks;
        let targetResultId = payload.id as string | undefined;

        const existingResult = blocks.find(
          (b) => b.id === payload.id && b.kind === "GAP_RESULT"
        ) as GapResultBlock | undefined;

        if (!existingResult) {
          targetResultId = generateId();
          const newResult: GapResultBlock = {
            id: targetResultId,
            kind: "GAP_RESULT",
            gapId: payload.gapId ?? "",
            value: typeof payload.value === "number" ? payload.value : 0,
            ts: payload.ts ?? Date.now(),
            inlineOnly: true,
          };
          workingBlocks = [...blocks, newResult];
        }

        const updatedBlocks = workingBlocks.map((b) =>
          b.kind === "CONDITION" && b.id === conditionId
            ? { ...b, rightRefId: targetResultId }
            : b
        );

        onBlocksChange(updatedBlocks);
      }
    } catch (err) {
      console.error("Condition drop error:", err);
    }
  }

  // 조건문 그룹에 조건문 추가
  function addConditionToGroup(groupId: string) {
    const newCondition: ConditionBlock = {
      id: generateId(),
      kind: "CONDITION",
      left: null,
      op: "≥",
      parentGroupId: groupId,
    };
    const group = blocks.find(
      (b) => b.kind === "CONDITION_GROUP" && b.id === groupId
    ) as ConditionGroupBlock | undefined;
    if (group) {
      const newBlocks = blocks.map((b) =>
        b.kind === "CONDITION_GROUP" && b.id === groupId
          ? { ...b, conditions: [...group.conditions, newCondition.id] }
          : b
      );
      onBlocksChange([...newBlocks, newCondition]);
    }
  }

  // Action 블록에 액션 추가
  function addActionToBlock(actionId: string, actionType: ActionType) {
    const newBlocks = blocks.map((b) => {
      if (b.kind === "ACTION" && b.id === actionId) {
        if (!b.actions.includes(actionType)) {
          return { ...b, actions: [...b.actions, actionType] };
        }
      }
      return b;
    });
    onBlocksChange(newBlocks);
  }

  // Action 블록에서 액션 제거
  function removeActionFromBlock(actionId: string, index: number) {
    const newBlocks = blocks.map((b) => {
      if (b.kind === "ACTION" && b.id === actionId) {
        const next = [...b.actions];
        next.splice(index, 1);
        return { ...b, actions: next };
      }
      return b;
    });
    onBlocksChange(newBlocks);
  }

  // Action 블록에서 선택하여 액션 추가
  function setActionSelection(actionId: string, value: ActionType | "") {
    setActionSelections((prev) => ({ ...prev, [actionId]: value }));
  }
  function addSelectedAction(actionId: string) {
    const sel = actionSelections[actionId];
    if (!sel) return;
    addActionToBlock(actionId, sel);
    setActionSelection(actionId, "");
  }

  // 조건문 그룹과 Action 연결
  function connectConditionToAction(groupId: string, actionId: string) {
    const newBlocks = blocks.map((b) => {
      if (b.kind === "CONDITION_GROUP" && b.id === groupId) {
        return { ...b, nextActionId: actionId };
      }
      if (b.kind === "ACTION" && b.id === actionId) {
        return { ...b, prevConditionId: groupId };
      }
      return b;
    });
    onBlocksChange(newBlocks);
  }

  // Action 블록 옆에 + 버튼 클릭
  function handleAddActionAfterCondition(groupId: string) {
    const newAction: ActionBlock = {
      id: generateId(),
      kind: "ACTION",
      actions: [],
      prevConditionId: groupId,
    };
    const newBlocks = blocks.map((b) =>
      b.kind === "CONDITION_GROUP" && b.id === groupId
        ? { ...b, nextActionId: newAction.id }
        : b
    );
    onBlocksChange([...newBlocks, newAction]);

    // 포지션 정리용 액션 제안
    const group = blocks.find(
      (b) => b.kind === "CONDITION_GROUP" && b.id === groupId
    ) as ConditionGroupBlock | undefined;
    if (group?.nextActionId) {
      const prevAction = blocks.find(
        (b) => b.kind === "ACTION" && b.id === group.nextActionId
      ) as ActionBlock | undefined;
      if (prevAction) {
        const hasBuy = prevAction.actions.some((a) => a.includes("buy"));
        if (hasBuy) {
          setConfirmModal({
            message: "포지션 정리용 action도 만드시겠습니까?",
            onConfirm: () => {
              const cleanupActions: ActionType[] = [];
              if (prevAction.actions.includes("binance_buy_spot_max_long")) {
                cleanupActions.push("binance_sell_spot_max_long");
              }
              if (prevAction.actions.includes("binance_buy_perp_max_short")) {
                cleanupActions.push("binance_sell_perp_max_short");
              }
              if (cleanupActions.length > 0) {
                const cleanupAction: ActionBlock = {
                  id: generateId(),
                  kind: "ACTION",
                  actions: cleanupActions,
                };
                onBlocksChange([...blocks, cleanupAction]);
              }
              setConfirmModal(null);
            },
          });
        }
      }
    }
  }

  // 다중 선택
  function handleBlockClick(e: React.MouseEvent, blockId: string) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedBlocks((prev) => {
        const next = new Set(prev);
        if (next.has(blockId)) {
          next.delete(blockId);
        } else {
          next.add(blockId);
        }
        return next;
      });
    } else {
      setSelectedBlocks(new Set([blockId]));
    }
  }

  // 우클릭 컨텍스트 메뉴
  function handleContextMenu(e: React.MouseEvent, blockIds: string[]) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, blockIds });
  }

  // 실행 취소 관리
  const executionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const executionCanceledRef = React.useRef(false);
  const currentExecLogIdRef = React.useRef<string | null>(null);

  // 실행
  function handleExecute() {
    if (selectedBlocks.size === 0) return;

    const actionIds = Array.from(selectedBlocks).filter((id) => {
      const block = blocks.find((b) => b.id === id);
      return block?.kind === "ACTION";
    });

    if (actionIds.length === 0) {
      alert("Action 블록을 선택해주세요.");
      return;
    }

    setConfirmModal({
      message: "정말 실행하시겠습니까?",
      onConfirm: () => {
        setConfirmModal(null);
        // derive selected action labels for logging
        const selectedActionLabels: string[] = actionIds.flatMap((aid) => {
          const ab = blocks.find((b) => b.kind === "ACTION" && b.id === aid) as
            | ActionBlock
            | undefined;
          return ab ? ab.actions.map((t) => getActionLabel(t)) : [];
        });

        // capital baseline (could be configurable later)
        const capitalBase = 10000;

        // create one execution log id and update in place across lifecycle
        const execLogId = generateId();
        currentExecLogIdRef.current = execLogId;

        // Pending log (대기 중)
        onLogEvent?.({
          id: execLogId,
          title: "대기 중",
          message: `${actionIds.length}개 액션이 대기 상태입니다`,
          status: "pending",
          timestamp: Date.now(),
          pnl: 0,
          capital: capitalBase,
          roiPercent: 0,
          actions: selectedActionLabels,
        });

        // Executing log (실행중)
        onLogEvent?.({
          id: execLogId,
          title: "실행중",
          message: `${actionIds.length}개 액션 실행을 시작했습니다`,
          status: "executing",
          timestamp: Date.now(),
          pnl: 0,
          capital: capitalBase,
          roiPercent: 0,
          actions: selectedActionLabels,
        });

        executionCanceledRef.current = false;
        const stopFn = () => {
          if (executionTimerRef.current) {
            clearTimeout(executionTimerRef.current);
            executionTimerRef.current = null;
          }
          executionCanceledRef.current = true;
          // finalize only when user stops: compute final metrics here
          const capital = capitalBase;
          const pnl = Math.round((Math.random() - 0.2) * 0.08 * capital);
          const roiPercent = (pnl / capital) * 100;
          const idToUpdate = currentExecLogIdRef.current || execLogId;
          onLogEvent?.({
            id: idToUpdate,
            title: "종료",
            message: `${actionIds.length}개 액션 실행이 종료되었습니다`,
            status: "success",
            timestamp: Date.now(),
            pnl,
            capital,
            roiPercent,
            actions: selectedActionLabels,
          });
          currentExecLogIdRef.current = null;
        };
        onRegisterStop?.(stopFn);
      },
    });
  }

  // GAP 가격 갱신
  async function refreshGapPrices(gapId: string) {
    const gap = blocks.find((b) => b.kind === "GAP" && b.id === gapId) as
      | GapBlock
      | undefined;
    if (!gap) return;

    const refreshedRefs = await Promise.all(
      gap.refs.map(async (r) => {
        const provider: ProviderType = r.provider || "binance";
        const p = await fetchMockPrice(r.market, r.symbol, provider);
        return { ...r, price: p.price, ts: p.ts, provider };
      })
    );

    const newBlocks = blocks.map((b) =>
      b.kind === "GAP" && b.id === gapId ? { ...b, refs: refreshedRefs } : b
    );
    ensureGapResultForGap(gapId, newBlocks);
  }

  // GAP_RESULT 드래그 시작
  function onResultDragStart(e: React.DragEvent, b: GapResultBlock) {
    const payload: DragPayload = {
      action: "move",
      kind: "GAP_RESULT",
      id: b.id,
      gapId: b.gapId,
      value: b.value,
      ts: b.ts,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  // PRICE_REF 드래그 시작
  function onPriceRefDragStart(e: React.DragEvent, b: PriceRefBlock) {
    const payload: DragPayload = {
      action: "move",
      kind: "PRICE_REF",
      id: b.id,
      market: b.market,
      symbol: b.symbol,
      provider: b.provider,
      price: b.price,
      ts: b.ts,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside() {
      setContextMenu(null);
    }
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  // 블록 렌더링
  function renderBlock(block: Block) {
    const isSelected = selectedBlocks.has(block.id);

    if (block.kind === "GAP") {
      return (
        <div
          key={block.id}
          className={`block ${isSelected ? "selected" : ""}`}
          onClick={(e) => handleBlockClick(e, block.id)}
          onContextMenu={(e) => handleContextMenu(e, [block.id])}
        >
          <div className="block-header">
            <div className="block-title">GAP 공식</div>
            <div className="block-actions">
              <button
                className="block-btn"
                onClick={() => refreshGapPrices(block.id)}
              >
                갱신
              </button>
              <button
                className="block-btn danger"
                onClick={() => deleteBlock(block.id)}
              >
                삭제
              </button>
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 40px 1fr",
              alignItems: "stretch",
              gap: 8,
            }}
          >
            {/* Left side (Spot = Numerator) */}
            <div
              className="condition-drop-zone"
              onDragOver={allowDrop}
              onDrop={(e) => onGapDropToMarket(e, block.id, "spot")}
              style={{
                borderColor: "var(--success)",
                background: block.refs.some((r) => r.market === "spot")
                  ? "rgba(16, 185, 129, 0.08)"
                  : undefined,
              }}
            >
              {(() => {
                const r = block.refs.find((x) => x.market === "spot");
                return r ? (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    ></div>
                    <div style={{ fontWeight: 600 }}>
                      {r.symbol} · {(r.provider || "binance").toUpperCase()} —{" "}
                      {r.price?.toLocaleString() ?? "-"}
                      {r.ts ? ` (${new Date(r.ts).toLocaleTimeString()})` : ""}
                    </div>
                  </div>
                ) : (
                  <span
                    style={{ color: "var(--text-secondary)", fontSize: 13 }}
                  >
                    Spot Price
                  </span>
                );
              })()}
            </div>
            {/* visual divider for horizontal formula */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontWeight: 700,
              }}
              aria-hidden
            >
              ÷
            </div>

            {/* Right side (Perp = Denominator) */}
            <div
              className="condition-drop-zone"
              onDragOver={allowDrop}
              onDrop={(e) => onGapDropToMarket(e, block.id, "perp")}
              style={{
                borderColor: "var(--primary)",
                background: block.refs.some((r) => r.market === "perp")
                  ? "rgba(59, 130, 246, 0.08)"
                  : undefined,
              }}
            >
              {(() => {
                const r = block.refs.find((x) => x.market === "perp");
                return r ? (
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    ></div>
                    <div style={{ fontWeight: 600 }}>
                      {r.symbol} · {(r.provider || "binance").toUpperCase()} —{" "}
                      {r.price?.toLocaleString() ?? "-"}
                      {r.ts ? ` (${new Date(r.ts).toLocaleTimeString()})` : ""}
                    </div>
                  </div>
                ) : (
                  <span
                    style={{ color: "var(--text-secondary)", fontSize: 13 }}
                  >
                    Perp Price
                  </span>
                );
              })()}
            </div>
          </div>
          {block.result != null && (
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>
              결과: {block.result}
            </div>
          )}
        </div>
      );
    }

    if (block.kind === "PRICE_REF") {
      return (
        <div
          key={block.id}
          className={`block ${isSelected ? "selected" : ""}`}
          draggable
          onDragStart={(e) => onPriceRefDragStart(e, block)}
          onClick={(e) => handleBlockClick(e, block.id)}
          onContextMenu={(e) => handleContextMenu(e, [block.id])}
        >
          <div className="block-header">
            <div>
              <div className="block-title">
                Price ({block.market}) {block.symbol}
                {block.price && `: ${block.price.toLocaleString()}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {(block.provider || "binance").toUpperCase()}
              </div>
            </div>
            <button
              className="block-btn danger"
              onClick={() => deleteBlock(block.id)}
            >
              삭제
            </button>
          </div>
        </div>
      );
    }

    if (block.kind === "GAP_RESULT") {
      if (block.inlineOnly) return null;
      return (
        <div
          key={block.id}
          className={`block ${isSelected ? "selected" : ""}`}
          draggable
          onDragStart={(e) => onResultDragStart(e, block)}
          onClick={(e) => handleBlockClick(e, block.id)}
          onContextMenu={(e) => handleContextMenu(e, [block.id])}
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            borderColor: "var(--success)",
            cursor: "grab",
          }}
        >
          <div className="block-header">
            <div className="block-title">GAP 결과: {block.value}</div>
            <button
              className="block-btn danger"
              onClick={() => deleteBlock(block.id)}
            >
              삭제
            </button>
          </div>
        </div>
      );
    }

    if (block.kind === "CONDITION") {
      const rightBlock = block.rightRefId
        ? blocks.find((b) => b.id === block.rightRefId)
        : null;

      return (
        <div
          key={block.id}
          className={`block ${isSelected ? "selected" : ""}`}
          onClick={(e) => handleBlockClick(e, block.id)}
          onContextMenu={(e) => handleContextMenu(e, [block.id])}
        >
          <div className="block-header">
            <div className="block-title">조건문</div>
            <button
              className="block-btn danger"
              onClick={() => deleteBlock(block.id)}
            >
              삭제
            </button>
          </div>
          <div className="condition-block">
            <input
              type="number"
              className="condition-input"
              value={block.left ?? ""}
              onChange={(e) =>
                updateCondition(block.id, {
                  left: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="값"
            />
            <select
              className="condition-operator"
              value={block.op}
              onChange={(e) =>
                updateCondition(block.id, {
                  op: e.target.value as OperatorType,
                })
              }
            >
              <option value="≥">≥</option>
              <option value="≤">≤</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="==">==</option>
              <option value="!=">!=</option>
            </select>
            <div
              className={`condition-drop-zone ${!rightBlock ? "empty" : ""}`}
              onDragOver={allowDrop}
              onDrop={(e) => onConditionDrop(e, block.id)}
            >
              {rightBlock && rightBlock.kind === "GAP_RESULT" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>GAP 결과: {rightBlock.value}</span>
                  <button
                    className="block-btn"
                    onClick={() =>
                      updateCondition(block.id, { rightRefId: undefined })
                    }
                    style={{ fontSize: 11, padding: "2px 6px" }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span style={{ color: "var(--text-secondary)" }}>
                  GAP 결과 블록을 드롭하세요
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (block.kind === "CONDITION_GROUP") {
      const conditions = blocks.filter(
        (b) => b.kind === "CONDITION" && b.parentGroupId === block.id
      ) as ConditionBlock[];
      const nextAction = block.nextActionId
        ? blocks.find((b) => b.id === block.nextActionId)
        : null;

      return (
        <div key={block.id}>
          <div
            className={`block ${isSelected ? "selected" : ""}`}
            onClick={(e) => handleBlockClick(e, block.id)}
            onContextMenu={(e) => handleContextMenu(e, [block.id])}
          >
            <div className="block-header">
              <div className="block-title">조건문 그룹</div>
              <div className="block-actions">
                <button
                  className="block-btn"
                  onClick={() => addConditionToGroup(block.id)}
                >
                  + 새 조건문
                </button>
                <button
                  className="block-btn danger"
                  onClick={() => deleteBlock(block.id)}
                >
                  삭제
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {conditions.map((cond) => (
                <div key={cond.id} style={{ marginBottom: 8 }}>
                  {renderBlock(cond)}
                </div>
              ))}
            </div>
          </div>
          <div className="connection-arrow">
            <button
              className="add-connection-btn"
              onClick={() => handleAddActionAfterCondition(block.id)}
              title="Action 블록 추가"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          {nextAction && nextAction.kind === "ACTION" && (
            <div>{renderBlock(nextAction)}</div>
          )}
        </div>
      );
    }

    if (block.kind === "ACTION") {
      return (
        <div
          key={block.id}
          className={`block ${isSelected ? "selected" : ""}`}
          onClick={(e) => handleBlockClick(e, block.id)}
          onContextMenu={(e) => handleContextMenu(e, [block.id])}
        >
          <div className="block-header">
            <div className="block-title">Action 블록</div>
            <button
              className="block-btn danger"
              onClick={() => deleteBlock(block.id)}
            >
              삭제
            </button>
          </div>
          <div className="action-block">
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <select
                value={actionSelections[block.id] ?? ""}
                onChange={(e) => {
                  const val = (e.target.value || "") as ActionType | "";
                  setActionSelection(block.id, val);
                  if (val) {
                    addActionToBlock(block.id, val as ActionType);
                    // 선택 후 placeholder로 초기화하여 연속 선택 가능
                    setTimeout(() => setActionSelection(block.id, ""), 0);
                  }
                }}
                style={{
                  padding: "6px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                }}
              >
                <option value="" disabled>
                  액션 선택
                </option>
                <option value="binance_buy_spot_max_long">
                  {getActionLabel("binance_buy_spot_max_long")}
                </option>
                <option value="binance_buy_perp_max_short">
                  {getActionLabel("binance_buy_perp_max_short")}
                </option>
                <option value="binance_sell_spot_max_long">
                  {getActionLabel("binance_sell_spot_max_long")}
                </option>
                <option value="binance_sell_perp_max_short">
                  {getActionLabel("binance_sell_perp_max_short")}
                </option>
              </select>
            </div>
            {block.actions.length === 0 ? (
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  padding: 12,
                  border: "2px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                }}
              >
                위에서 액션을 선택하여 추가하세요
              </div>
            ) : (
              block.actions.map((action, idx) => (
                <div
                  key={idx}
                  className="action-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{getActionLabel(action)}</span>
                  <button
                    className="block-btn danger"
                    onClick={() => removeActionFromBlock(block.id, idx)}
                    title="액션 제거"
                    style={{ padding: "2px 6px", fontSize: 11 }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="formula-editor">
      {!hideHeader && (
        <>
          <h2 style={{ margin: 0, marginBottom: 8 }}>{title}</h2>
          <p
            style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}
          >
            사이드바에서 블록을 드래그하여 캔버스에 배치하세요.
          </p>
        </>
      )}
      <div
        ref={canvasRef}
        className="editor-canvas"
        onDragOver={allowDrop}
        onDrop={onCanvasDrop}
        style={{ position: "relative", minHeight: 400 }}
      >
        {blocks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              padding: "40px 20px",
            }}
          >
            블록을 드래그하여 여기에 배치하세요
          </div>
        ) : (
          blocks
            .filter(
              (b) =>
                b.kind !== "CONDITION" &&
                !(b.kind === "ACTION" && b.prevConditionId)
            )
            .map((b) => {
              const hasPos = (b as any).x != null && (b as any).y != null;
              const wrapperStyle = hasPos
                ? {
                    position: "absolute" as const,
                    left: (b as any).x,
                    top: (b as any).y,
                  }
                : undefined;
              return (
                <div
                  key={b.id}
                  style={{ ...wrapperStyle, cursor: "move" }}
                  onMouseDown={(e) => onBlockMouseDown(e, b.id)}
                >
                  {renderBlock(b)}
                </div>
              );
            })
        )}
      </div>

      {selectedBlocks.size > 0 && (
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={handleExecute}>
            실행 ({selectedBlocks.size}개 선택됨)
          </button>
          <button
            className="btn-secondary"
            onClick={() => setSelectedBlocks(new Set())}
          >
            선택 해제
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleExecute}>
            실행
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              contextMenu.blockIds.forEach((id) => deleteBlock(id));
              setContextMenu(null);
            }}
          >
            삭제
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* 실행 결과는 TradingMonitor를 자동 표시하지 않음 (로그/위젯 활용) */}
    </div>
  );
}
