"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";

const faqs = [
  {
    q: "What counts as an HTML tag?",
    a: "Any angle-bracket element: <div>, <p>, <span>, <h1>, <img>, <button>... all banned. This includes JSX. React.createElement is fine, JSX syntax is not. CSS selectors don't count.",
  },
  {
    q: "What languages can I use?",
    a: "Anything that renders in a browser without HTML tags. Common picks: canvas (JS/TS), WebGL, CSS-only (yes, really), WASM, Python + Brython, Rust + wasm-bindgen. Surprise me.",
  },
  {
    q: "What's the minimum hours?",
    a: "4 hours of Hackatime project time to qualify. Ship it and claim your free luggage tag. Every hour past that also earns shop stamps with no cap.",
  },
  {
    q: "I'm in a Hack Club. How does the workshop work?",
    a: "Club leaders: Tagless will run as a workshop through clubs.hackclub.com, check there once it's live. Not in a club? Just submit solo below, no club needed.",
  },
  {
    q: "Does the site have to look good?",
    a: "You're in luck! I couldn't care less if it looked like a garbage fire or if it wins an award on awwwards.com. It just has to render in a browser without HTML tags. A white page with text from a canvas element counts. A full 3D WebGL experience also counts.",
  },
  {
    q: "Is this legit?",
    a: (
      <span>
        Oh yeah it is! We're{' '}
        <a
          href="https://hackclub.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-magenta underline"
        >
          Hack Club
        </a>
        , a nonprofit that's been running these kinds of programs for literally years. Teens build projects, we send out real prizes :)
      </span>
    ),
  },
  {
    q: "When do I get paid?",
    a: (
      <span>
        Once I review it but generally within a week or two of submission (unless I'm on vacation, which I'll put on my{' '}
        <a
          href="https://hackclub.enterprise.slack.com/archives/D0AEYTQSS8M"
          target="_blank"
          rel="noopener noreferrer"
          className="text-magenta underline"
        >
          slack profile
        </a>
        ).
      </span>
    ),
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-paper py-20">
      <div className="max-w-[1100px] mx-auto px-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-x-16 gap-y-10 items-start">
        <div className="md:sticky md:top-24">
          <h2
            className="font-display text-ink mb-4"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            faq.
          </h2>
          <p className="text-ink-soft text-[15px] leading-relaxed mb-6 max-w-[28ch]">
            Still stuck? Ask in the Hack Club Slack, someone's always awake.
          </p>
          <ButtonLink href="https://hackclub.com/slack" variant="ghost" className="text-[13px]">
            join the slack ↗
          </ButtonLink>
        </div>

        <div className="divide-y divide-ink/15 border-y-[1.5px] border-ink/15">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            const answerId = `faq-answer-${i}`;
            const questionId = `faq-question-${i}`;

            return (
              <div key={f.q}>
                <button
                  id={questionId}
                  className="group w-full flex items-center justify-between py-5 text-left gap-4 font-body font-semibold text-ink hover:text-magenta transition-colors duration-200 cursor-pointer"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                >
                  {f.q}
                  <ChevronDown
                    className={cn(
                      "flex-shrink-0 text-ink-soft transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-magenta motion-reduce:transition-none",
                      isOpen && "rotate-180 text-magenta"
                    )}
                    size={18}
                  />
                </button>
                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={questionId}
                  aria-hidden={!isOpen}
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p
                      className={cn(
                        "pb-5 text-ink-soft text-[15px] leading-relaxed max-w-[65ch] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                        isOpen ? "translate-y-0" : "-translate-y-2"
                      )}
                    >
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
