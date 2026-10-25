"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

const links = [
  { label: "Hackatime setup guide", href: "https://hackatime.hackclub.com/my/wakatime_setup", mono: "hackatime.hackclub.com", external: false },
  { label: "Hack Club Slack", href: "https://hackclub.com/slack", mono: "hackclub.com/slack", external: true },
  { label: "How to build without tags", href: "/docs/resources", mono: "resources", external: false },
  { label: "Canvas API reference", href: "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API", mono: "MDN", external: true },
];

function DraggableSticker() {
  const ref = useRef<HTMLImageElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current!;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.offsetLeft;
    const origY = el.offsetTop;
    el.style.transition = "none";
    el.style.scale = "1.12";
    el.style.zIndex = "99999";
    el.style.filter = "drop-shadow(0 8px 24px rgba(0,0,0,0.5))";

    const onMove = (e: PointerEvent) => {
      el.style.left = `${origX + (e.clientX - startX)}px`;
      el.style.top = `${origY + (e.clientY - startY)}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.style.transition = "scale 0.2s ease, filter 0.2s ease";
      el.style.scale = "1";
      el.style.zIndex = "10";
      el.style.filter = "drop-shadow(0 2px 8px rgba(0,0,0,0.3))";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  return (
    <img
      ref={ref}
      src="https://cdn.hackclub.com/019d730c-a7e5-7243-a2d5-b00e3892f92f/plwTidMBheiW1wa_9XBuXZ2fUfGDVcAG0b4GXP-JSb0"
      alt=""
      draggable={false}
      onPointerDown={onPointerDown}
      className="hidden sm:block object-contain cursor-grab select-none"
      style={{
        position: "absolute",
        left: "clamp(0px, calc(50% + 580px), calc(100% - 18vw))",
        top: "160px",
        width: "clamp(140px, 18vw, 288px)",
        height: "clamp(140px, 18vw, 288px)",
        zIndex: 10,
        filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
        transition: "scale 0.2s ease, filter 0.2s ease",
      }}
    />
  );
}

export function Resources() {
  const sectionRef = useRef<HTMLElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const handleScroll = () => {
      if (!sectionRef.current || !parallaxRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = -rect.top / window.innerHeight;
      parallaxRef.current.style.transform = `translateY(${progress * 28}px)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRevealed(true); },
      { threshold: 0.12 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .resource-card {
          transition:
            box-shadow 0.22s ease,
            background 0.22s ease,
            transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .resource-card:hover {
          background: rgba(255,255,255,0.10) !important;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.18),
            0 8px 24px rgba(0,0,0,0.7),
            0 24px 56px rgba(0,0,0,0.55) !important;
          transform: translateY(-3px) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .resource-card,
          .resource-card:hover {
            transition: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="w-full leading-[0]" style={{ background: "var(--color-paper-warm)" }}>
        <img src="/assets/wave-ink.svg" alt="" className="w-full block" />
      </div>

      <section ref={sectionRef} className="bg-ink py-20 relative">
        <DraggableSticker />
        <div className="max-w-[1200px] mx-auto px-6">
          <div ref={parallaxRef} style={{ willChange: "transform" }}>
            <EyebrowLabel className="mb-3 block text-smoke">resources</EyebrowLabel>
            <h2
              className="font-display text-paper mb-10"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1 }}
            >
              need a nudge?
            </h2>
          </div>

          <div className="flex flex-col gap-3 max-w-[580px]">
            {links.map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="resource-card flex items-center justify-between border border-white/20 rounded-md px-5 py-4 no-underline group"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 8px 28px rgba(0,0,0,0.55)",
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "translateY(0)" : "translateY(18px)",
                  transition: `opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${i * 75}ms, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${i * 75}ms`,
                }}
              >
                <span className="font-body font-semibold text-paper">{l.label}</span>
                <span className="font-mono text-[12px] text-smoke group-hover:text-paper/70 transition-colors duration-200">
                  {l.mono}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full leading-[0]" style={{ background: "var(--color-paper)" }}>
        <img src="/assets/wave-ink.svg" alt="" className="w-full block" style={{ transform: "scaleY(-1)" }} />
      </div>
    </>
  );
}
