"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { AirtableRecordWithId } from "@/lib/types";

interface Props {
  draft: AirtableRecordWithId;
  onContinue: (draft: AirtableRecordWithId) => void;
  onDiscarded: () => void;
  submissionsOpen: boolean;
}

export function DraftCard({ draft, onContinue, onDiscarded, submissionsOpen }: Props) {
  const [discarding, setDiscarding] = useState(false);

  async function discard() {
    if (!confirm("Discard this draft? This can't be undone.")) return;
    setDiscarding(true);
    const res = await fetch(`/api/submit/draft/${draft._id}`, { method: "DELETE" });
    if (res.ok) {
      onDiscarded();
    } else {
      setDiscarding(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-dashed">
      <EyebrowLabel>draft</EyebrowLabel>
      <p className="text-sm text-ink-soft line-clamp-3 min-h-[2.5em]">
        {draft.Description || "No description yet."}
      </p>
      <div className="flex gap-3 items-center">
        <Button
          variant="ink"
          onClick={() => onContinue(draft)}
          disabled={!submissionsOpen}
          className="text-sm"
        >
          continue →
        </Button>
        <button
          onClick={discard}
          disabled={discarding}
          className="font-mono text-xs text-ink-soft underline hover:text-magenta disabled:opacity-50"
        >
          {discarding ? "discarding..." : "discard"}
        </button>
      </div>
      {!submissionsOpen && (
        <p className="text-xs text-smoke">submissions closed. view-only for now.</p>
      )}
    </Card>
  );
}
