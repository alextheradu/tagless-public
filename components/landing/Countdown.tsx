"use client";

import { useEffect, useState } from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parts(ms: number) {
  return [
    { unit: "d", value: Math.floor(ms / DAY) },
    { unit: "h", value: Math.floor((ms % DAY) / HOUR) },
    { unit: "m", value: Math.floor((ms % HOUR) / MINUTE) },
    { unit: "s", value: Math.floor((ms % MINUTE) / SECOND) },
  ];
}

export function Countdown({ close }: { close: string }) {
  const end = new Date(close).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), SECOND);
    return () => clearInterval(id);
  }, []);

  if (isNaN(end)) return null;

  const remaining = now === null ? null : end - now;
  const closed = remaining !== null && remaining <= 0;
  const deadline = new Date(end).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className="inline-flex flex-col items-start gap-1.5 border-2 border-ink rounded-sm bg-paper shadow-hard px-3.5 py-2.5"
      title={`submissions close ${deadline}`}
    >
      <span className="font-mono text-[9px] font-medium tracking-[0.14em] uppercase text-ink-soft leading-none">
        {closed ? "submissions closed" : "submissions close in"}
      </span>
      {!closed && (
        <span role="timer" className="flex items-baseline gap-2 font-mono font-bold text-[28px] text-magenta tabular-nums leading-none">
          {parts(remaining ?? 0).map(({ unit, value }) => (
            <span key={unit}>
              {remaining === null ? "--" : String(value).padStart(2, "0")}
              <span className="text-[10px] text-ink-soft font-medium ml-[2px]">{unit}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
