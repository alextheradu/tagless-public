"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { AirtableRecordWithId } from "@/lib/types";

interface Props {
  submission: AirtableRecordWithId;
}

const inputClass =
  "w-full border-[1.5px] border-ink rounded-md px-3 py-2 font-body text-sm bg-paper focus:outline-none focus:border-magenta";

export function ResubmitForm({ submission }: Props) {
  const router = useRouter();
  const [codeUrl, setCodeUrl] = useState(submission["Code URL"] ?? "");
  const [playableUrl, setPlayableUrl] = useState(submission["Playable URL"] ?? "");
  const [githubUsername, setGithubUsername] = useState(submission["GitHub Username"] ?? "");
  const [description, setDescription] = useState(submission.Description ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/submit/resubmit/${submission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeUrl,
          playableUrl,
          githubUsername,
          description,
          hackatimeProject: submission["Hackatime Project"],
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Failed to resubmit" }));
        setError(msg);
        setStatus("error");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to resubmit. Please try again.");
      setStatus("error");
    }
  }

  return (
    <Card className="p-6 flex flex-col gap-4">
      <EyebrowLabel>fix and resubmit</EyebrowLabel>
      <p className="text-sm text-ink-soft">
        Update what needs fixing, then send it back — it goes straight back into the review queue.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-smoke">code url</span>
            <input
              type="url"
              value={codeUrl}
              onChange={(e) => setCodeUrl(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-smoke">playable url</span>
            <input
              type="url"
              value={playableUrl}
              onChange={(e) => setPlayableUrl(e.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-smoke">github username</span>
          <input
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-smoke">description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={4}
            className={inputClass + " resize-none"}
          />
        </label>

        {error && <p className="text-sm text-magenta">{error}</p>}

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full bg-mint text-ink font-body font-bold py-2.5 rounded-pill border-[1.5px] border-ink hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
        >
          {status === "saving" ? "sending..." : "resubmit →"}
        </button>
      </form>
    </Card>
  );
}
