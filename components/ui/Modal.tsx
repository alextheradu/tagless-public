"use client";
import { useEffect } from "react";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ onClose, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .modal-backdrop, .modal-panel { animation: none !important; }
        }
      `}</style>
      <div
        className="modal-backdrop fixed inset-0 bg-char/40 z-40 backdrop-blur-[2px]"
        style={{ animation: "modal-backdrop-in 0.2s ease-out" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 overflow-y-auto py-10 px-4 flex items-start justify-center">
        <div
          className="modal-panel w-full max-w-[680px] bg-paper border-[1.5px] border-ink rounded-xl shadow-hard p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}
