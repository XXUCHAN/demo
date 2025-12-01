"use client";
import React from "react";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">확인</div>
        <div className="modal-content">{message}</div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            취소
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

