import { ButtonLink } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Reveal } from "@/components/ui/Reveal";
import { TagMockup } from "./TagMockup";
import { Countdown } from "./Countdown";

const photos = [
  "/assets/hero_photo1.webp",
  "/assets/hero_photo2.webp",
  "/assets/hero_photo3.webp",
  "/assets/hero_photo4.webp",
  "/assets/hero_photo5.webp",
  "/assets/hero_photo6.webp",
];

const rotA = [-1.8, 2.0, -1.5];
const rotB = [2.2, -2.0, 1.8];

const facts = [
  { k: "prize", v: "custom hack club luggage tag :)" },
  { k: "workshops", v: "clubs.hackclub.com" },
  { k: "extra hours", v: "spend stamps in the shop" },
  { k: "required hours", v: "4 hours (minimum)" },
];

export function Hero({ close }: { close?: string | null }) {
  return (
    <section className="max-w-[1200px] mx-auto px-6 pt-14 pb-16">
      <style>{`
        .hero-photo {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hero-photo:hover {
          transform: rotate(0deg) scale(1.04) !important;
          box-shadow: 6px 6px 0 #1a1729;
          position: relative;
          z-index: 5;
        }
        .tag-mockup:hover {
          animation: tag-wiggle 0.6s ease-in-out;
        }
        @keyframes tag-wiggle {
          0%, 100% { transform: rotate(-4deg); }
          25% { transform: rotate(8deg); }
          50% { transform: rotate(-10deg); }
          75% { transform: rotate(5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-photo, .hero-photo:hover { transition: none; transform: none !important; }
          .tag-mockup:hover { animation: none; }
        }
      `}</style>

      <div className="flex items-start gap-8 xl:gap-14">

        <div className="flex-1 min-w-0 pt-2 pb-2 lg:pb-6">

          <Reveal delay={60}>
            <h1
              className="font-display text-ink leading-[0.9] tracking-tight mb-8"
              style={{ fontSize: "clamp(50px, 6.5vw, 100px)" }}
            >
              build a website.
              <br className="hidden sm:block" />
              {" "}
              <span className="not-italic text-magenta">no html tags.</span>
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="font-body text-[18px] text-ink-soft leading-[1.55] max-w-[500px] mb-8">
              Ship a website without a single HTML tag: not in raw HTML, not in JSX,
              not anywhere. Spend <span className="bg-highlight text-ink font-semibold px-[3px] rounded-[2px]">4 hours</span> on your project and{" "}
              <span className="bg-highlight text-ink font-semibold px-[3px] rounded-[2px]">
                claim your luggage tag
              </span>
              ! Every extra hour past that earns shop stamps too!
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="flex flex-wrap items-center gap-5 mb-6">
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/submit" variant="primary">ship it →</ButtonLink>
                <ButtonLink href="/docs" variant="ghost">read the resources</ButtonLink>
              </div>
              <TagMockup />
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex items-center gap-4 max-w-[520px] pt-2">
              <div className="flex-1 border-t-[1.5px] border-ink/15" />
              <span className="font-mono text-[10px] text-ink-soft/60 whitespace-nowrap">
                sponsored by Jared
              </span>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-5 max-w-[520px]">
              {facts.map((f) => (
                <div key={f.k} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[10px] tracking-[0.14em] uppercase text-smoke">{f.k}</dt>
                  <dd className="font-body font-bold text-[15px] text-ink leading-none">
                    {f.k === "workshops" ? (
                      <a href="https://clubs.hackclub.com" className="underline" target="_blank" rel="noreferrer">
                        {f.v}
                      </a>
                    ) : (
                      f.v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="hidden lg:flex flex-col flex-shrink-0 items-center gap-8 w-[356px]">
          <div className="flex items-start gap-3 w-full">
            <div className="flex flex-col gap-3 pt-10 flex-1">
              {[0, 2, 4].map((idx, i) => (
                <Reveal key={photos[idx]} delay={120 + i * 90}>
                  <img
                    src={photos[idx]}
                    alt=""
                    className="hero-photo w-full h-[112px] object-cover rounded-sm border-2 border-ink shadow-hard"
                    style={{ transform: `rotate(${rotA[i]}deg)` }}
                  />
                </Reveal>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-1 flex-1">
              {[1, 3, 5].map((idx, i) => (
                <Reveal key={photos[idx]} delay={170 + i * 90}>
                  <img
                    src={photos[idx]}
                    alt=""
                    className="hero-photo w-full h-[118px] object-cover rounded-sm border-2 border-ink shadow-hard"
                    style={{ transform: `rotate(${rotB[i]}deg)` }}
                  />
                </Reveal>
              ))}
            </div>
          </div>
          {close && (
            <Reveal delay={450}>
              <Countdown close={close} />
            </Reveal>
          )}
        </div>
      </div>

      <div
        className="flex lg:hidden gap-3 overflow-x-auto pb-2 -mx-6 px-6"
        style={{ maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)" }}
      >
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className="h-[125px] w-auto flex-shrink-0 rounded-sm border-2 border-ink shadow-hard object-cover"
            style={{ transform: `rotate(${i % 2 === 0 ? 1.5 : -1.2}deg)` }}
          />
        ))}
      </div>
      {close && (
        <Reveal className="lg:hidden mt-6">
          <Countdown close={close} />
        </Reveal>
      )}
    </section>
  );
}
