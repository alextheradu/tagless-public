const tags = [
  "<div>", "<span>", "<h1>", "<p>", "<img>", "<button>", "<a>", "<section>",
  "<ul>", "<table>", "<form>", "<nav>", "<footer>", "<main>", "<article>", "<input>",
];

export function TagMarquee() {
  const row = tags.map((t) => (
    <span key={t} className="inline-flex items-center gap-6 shrink-0">
      <span className="line-through decoration-magenta decoration-[2.5px]">{t}</span>
      <span className="text-magenta select-none" aria-hidden>×</span>
    </span>
  ));

  return (
    <div className="relative">
      <div
        className="relative z-10 -rotate-[1.2deg] w-[104%] -ml-[2%] bg-ink border-y-[1.5px] border-ink overflow-hidden"
        aria-hidden
      >
      <style>{`
        @keyframes tag-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .tag-marquee-track { animation: tag-marquee 36s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tag-marquee-track { animation: none; }
        }
      `}</style>
      <div className="tag-marquee-track flex w-max gap-6 py-2.5 font-mono text-[13px] text-paper/85">
        <div className="flex gap-6 shrink-0">{row}</div>
        <div className="flex gap-6 shrink-0">{row}</div>
      </div>
      </div>
    </div>
  );
}
