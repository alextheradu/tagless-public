import { Reveal } from "@/components/ui/Reveal";

const steps = [
  {
    n: "1",
    color: "var(--color-cobalt)",
    title: "track your time",
    body: "Set up Hackatime (free, open source WakaTime). Create a project and log your hours. Minimum 4 hours to qualify.",
  },
  {
    n: "2",
    color: "var(--color-magenta)",
    title: "build a website",
    body: "Use any language or framework: Python, Rust, raw JS, whatever. The only rule: zero HTML tags anywhere in your code.",
  },
  {
    n: "3",
    color: "var(--color-plum)",
    title: "ship it",
    body: "After you complete 4 hours, deploy your site somewhere public. Then fill out the submission form!",
  },
  {
    n: "4",
    color: "var(--color-mint)",
    title: "get a tag",
    body: "After you ship your project, you'll get reviewed. Once approved, you'll get a slack message from our bot to claim your luggage tag. Spend more than 4 hours? Earn stamps to use in the shop!",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-paper-warm
    pt-20 pb-20 -mt-5">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <h2
            className="font-display text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            four steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-2">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="border-t-[1.5px] border-ink/15 pt-5 pb-8 flex items-start gap-5">
                <span
                  className="font-display leading-[0.8] select-none"
                  style={{ fontSize: "clamp(56px, 6vw, 84px)", color: s.color }}
                  aria-hidden
                >
                  {s.n}
                </span>
                <div className="flex flex-col gap-2 pt-2">
                  <h3 className="font-body font-extrabold text-[19px] text-ink leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-ink-soft text-[15px] leading-relaxed max-w-[42ch]">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
