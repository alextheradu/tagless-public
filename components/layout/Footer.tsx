const columns = [
  {
    title: "event",
    links: [
      { label: "docs", href: "/docs" },
      { label: "submit", href: "/submit" },
      { label: "resources", href: "/docs/resources" },
    ],
  },
  {
    title: "hack club",
    links: [
      { label: "hackclub.com", href: "https://hackclub.com", external: true },
      { label: "slack", href: "https://hackclub.com/slack", external: true },
      { label: "github", href: "https://github.com/hackclub", external: true },
      { label: "running a club? →", href: "https://clubs.hackclub.com", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-10">
        <div className="flex flex-col lg:flex-row justify-between gap-12">
          <div className="max-w-[420px]">
            <p
              className="font-display leading-[0.9] mb-4"
              style={{ fontSize: "clamp(44px, 5vw, 72px)" }}
            >
              tagless<span className="text-magenta">.</span>
            </p>
            <p className="font-mono text-[13px] text-smoke leading-relaxed">
              build a website.{" "}
              <span className="line-through decoration-magenta decoration-2 text-paper/70">
                no html tags.
              </span>
            </p>
          </div>

          <div className="flex gap-16 sm:gap-24">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-smoke mb-4">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...("external" in l && l.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-[14px] text-paper/75 hover:text-magenta no-underline transition-colors duration-150"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
            tagless, a Hack Club YSWS
          </p>
          <p className="font-mono text-[11px] text-smoke">
            this page contains html tags. do as we say, not as we do.
          </p>
        </div>
      </div>
    </footer>
  );
}
