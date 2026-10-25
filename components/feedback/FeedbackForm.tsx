"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { cn } from "@/lib/utils";
import { PARTICIPATION_OPTIONS } from "@/lib/feedback";

const inputClass = "w-full border-[1.5px] border-ink rounded-md px-4 py-3 font-body text-sm bg-paper placeholder:text-smoke transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-magenta focus:shadow-[0_0_0_4px_rgba(255,45,111,0.12)]";

export function FeedbackForm() {
  const [recommend, setRecommend] = useState<number | null>(null);
  const [didWell, setDidWell] = useState("");
  const [improve, setImprove] = useState("");
  const [extraThoughts, setExtraThoughts] = useState("");
  const [canEmail, setCanEmail] = useState<"yes" | "no" | "">("");
  const [participation, setParticipation] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recommend === null) {
      setStatus("error");
      setErrorMsg("Pick a number from 1 to 10.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommend, didWell, improve, extraThoughts, canEmail, participation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  if (status === "success") {
    return (
      <Card className="max-w-[520px] mx-auto w-full text-center py-12">
        <p className="font-display text-3xl text-mint mb-4">thank you.</p>
        <p className="text-ink-soft">We read every response. It helps us make the next YSWS better.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 max-w-[600px] mx-auto w-full">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2">
          <EyebrowLabel>On a scale from 1-10, how likely are you to recommend this YSWS to a friend?</EyebrowLabel>
        </legend>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <label
              key={n}
              className={cn(
                "flex items-center justify-center h-11 border-[1.5px] border-ink rounded-md font-mono text-sm cursor-pointer transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-magenta",
                recommend === n ? "bg-magenta text-white" : "bg-paper text-ink hover:bg-paper-warm"
              )}
            >
              <input
                type="radio"
                name="recommend"
                value={n}
                checked={recommend === n}
                onChange={() => setRecommend(n)}
                required
                className="sr-only"
              />
              {n}
            </label>
          ))}
        </div>
        <div className="flex justify-between text-xs text-smoke">
          <span>not likely</span>
          <span>very likely</span>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="didWell"><EyebrowLabel>What do you think we did well?</EyebrowLabel></label>
        <textarea
          id="didWell"
          className={inputClass + " resize-none"}
          rows={3}
          required
          maxLength={5000}
          value={didWell}
          onChange={(e) => setDidWell(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="improve"><EyebrowLabel>What's something we can improve?</EyebrowLabel></label>
        <textarea
          id="improve"
          className={inputClass + " resize-none"}
          rows={3}
          required
          maxLength={5000}
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="extraThoughts"><EyebrowLabel>Any extra thoughts you'd like to tell us?</EyebrowLabel></label>
        <p className="text-xs text-smoke">Optional.</p>
        <textarea
          id="extraThoughts"
          className={inputClass + " resize-none"}
          rows={3}
          maxLength={5000}
          value={extraThoughts}
          onChange={(e) => setExtraThoughts(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2">
          <EyebrowLabel>Can we e-mail you if we have any further questions?</EyebrowLabel>
        </legend>
        {(["yes", "no"] as const).map((v) => (
          <label key={v} className="flex items-center gap-3 text-sm text-ink cursor-pointer">
            <input
              type="radio"
              name="canEmail"
              value={v}
              checked={canEmail === v}
              onChange={() => setCanEmail(v)}
              required
              className="w-4 h-4 shrink-0 accent-magenta"
            />
            {v === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2">
          <EyebrowLabel>How did you do this YSWS?</EyebrowLabel>
        </legend>
        {PARTICIPATION_OPTIONS.map((opt) => (
          <label key={opt} className="flex items-center gap-3 text-sm text-ink cursor-pointer">
            <input
              type="radio"
              name="participation"
              value={opt}
              checked={participation === opt}
              onChange={() => setParticipation(opt)}
              required
              className="w-4 h-4 shrink-0 accent-magenta"
            />
            {opt}
          </label>
        ))}
      </fieldset>

      {status === "error" && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
          {errorMsg}
        </p>
      )}

      <p className="text-xs text-smoke">You can only submit this once.</p>

      <div>
        <Button type="submit" variant="primary" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
