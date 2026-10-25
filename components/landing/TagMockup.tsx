"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_DURATION_MS = 200;

export function TagMockup() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  function requestClose() {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setOpen(false);
      return;
    }
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_DURATION_MS);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <style>{`
        @keyframes tag-lightbox-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tag-lightbox-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes tag-lightbox-image-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes tag-lightbox-image-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.85); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tag-lightbox-backdrop, .tag-lightbox-image { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 cursor-zoom-in"
        aria-label="View luggage tag mockup full size"
      >
        <img
          src="/assets/tag-mockup.webp"
          alt="Hack Club Tagless luggage tag"
          className="tag-mockup w-14 h-14 object-cover rounded-xl border-2 border-ink shadow-hard"
          style={{ transform: "rotate(-4deg)" }}
        />
        <span className="font-mono text-[10px] text-ink-soft uppercase tracking-wide whitespace-nowrap text-left">
          &nbsp;← your prize
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Luggage tag mockup, full size"
            className="tag-lightbox-backdrop fixed inset-0 z-50 flex items-center justify-center bg-char/60 backdrop-blur-sm p-6 cursor-zoom-out"
            style={{
              animation: closing
                ? `tag-lightbox-backdrop-out ${CLOSE_DURATION_MS}ms ease-in forwards`
                : "tag-lightbox-backdrop-in 0.2s ease-out",
            }}
            onClick={requestClose}
          >
            <img
              src="/assets/tag-mockup-full.webp"
              alt="Hack Club Tagless luggage tag, full size"
              className="tag-lightbox-image max-w-full max-h-full rounded-xl border-2 border-ink shadow-hard-lg cursor-default"
              style={{
                animation: closing
                  ? `tag-lightbox-image-out ${CLOSE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
                  : "tag-lightbox-image-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="absolute top-5 right-5 text-paper text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full bg-ink/80 hover:bg-ink"
            >
              ×
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
