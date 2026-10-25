"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { HackatimeConnect, type HackatimeProject } from "@/components/submit/HackatimeConnect";
import { ProjectMultiSelect, formatProjectHours } from "@/components/submit/ProjectMultiSelect";
import { isIdVerified } from "@/lib/identity";
import { MIN_HOURS_FOR_UPDATE } from "@/lib/projectUpdates";
import {
  descriptionsFromBreakdown,
  joinHackatimeProjects,
  parseHackatimeProjects,
} from "@/lib/hackatimeProjects";
import type { AirtableRecordWithId } from "@/lib/types";
import type { SessionData } from "@/lib/auth";

interface Props {
  user: NonNullable<SessionData["user"]>;
  root: AirtableRecordWithId;
  since: string;
}

const inputClass =
  "w-full border-[1.5px] border-ink rounded-md px-3 py-2 font-body text-sm bg-paper focus:outline-none focus:border-magenta";
const labelClass = "text-[11px] font-mono uppercase tracking-wider text-smoke";

export function UpdateForm({ user, root, since }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<HackatimeProject[]>([]);
  const [hackatimeConnected, setHackatimeConnected] = useState(false);
  const [codeUrl, setCodeUrl] = useState(root["Code URL"] ?? "");
  const [playableUrl, setPlayableUrl] = useState(root["Playable URL"] ?? "");
  const [hackatimeProject, setHackatimeProject] = useState(root["Hackatime Project"] ?? "");
  const [projectDescriptions, setProjectDescriptions] = useState<Record<string, string>>(() =>
    descriptionsFromBreakdown(root["Hackatime Project Breakdown"])
  );
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [lapseHours, setLapseHours] = useState("");
  const [lapseJustification, setLapseJustification] = useState("");
  const [noAiPledge, setNoAiPledge] = useState(false);
  const [rulesPledge, setRulesPledge] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  const handleProjects = useCallback((p: HackatimeProject[]) => {
    setProjects(p);
    setHackatimeConnected(true);
  }, []);

  const selectedProjects = parseHackatimeProjects(hackatimeProject);
  const needsProjectDescriptions = selectedProjects.length > 1;
  const missingProjectDescriptions =
    needsProjectDescriptions && selectedProjects.some((name) => !projectDescriptions[name]?.trim());
  const newSeconds = projects
    .filter((p) => selectedProjects.includes(p.name))
    .reduce((sum, p) => sum + p.totalSeconds, 0);
  const newHours = newSeconds / 3600 + Math.max(0, parseFloat(lapseHours) || 0);
  const idVerified = isIdVerified(user.verificationStatus);
  const sinceLabel = new Date(since).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenshot) {
      setError("Screenshot is required.");
      setStatus("error");
      return;
    }
    if (parseFloat(lapseHours) > 0 && !lapseJustification.trim()) {
      setError("Add links explaining your claimed lapse hours.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setError("");

    const body = new FormData();
    body.append("codeUrl", codeUrl);
    body.append("playableUrl", playableUrl);
    body.append("hackatimeProject", hackatimeProject);
    body.append(
      "projectDescriptions",
      JSON.stringify(Object.fromEntries(selectedProjects.map((name) => [name, projectDescriptions[name] ?? ""])))
    );
    body.append("description", description);
    body.append("lapseHours", lapseHours || "0");
    body.append("lapseJustification", lapseJustification);
    body.append("noAiPledge", String(noAiPledge));
    body.append("rulesPledge", String(rulesPledge));
    body.append("screenshot", screenshot);

    try {
      const res = await fetch(`/api/submit/update/${root._id}`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      router.push(`/submit/${data.id}`);
    } catch {
      setError("Failed to ship your update. Please try again.");
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <Card className="p-6 flex flex-col gap-3">
        <EyebrowLabel>keep building?</EyebrowLabel>
        <p className="text-sm text-ink-soft">
          Added more to this project? Ship an update. Time logged since {sinceLabel} counts
          (at least {MIN_HOURS_FOR_UPDATE}h), and all of it goes to stamps.
        </p>
        <Button variant="primary" onClick={() => setOpen(true)} className="self-start">
          ship an update →
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <EyebrowLabel>ship an update</EyebrowLabel>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-xs text-ink-soft hover:text-ink"
        >
          cancel
        </button>
      </div>
      <p className="text-sm text-ink-soft">
        Only time logged since {sinceLabel} counts toward this update. You need at least{" "}
        {MIN_HOURS_FOR_UPDATE}h of new time. It gets reviewed like a new submission.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>code url</span>
            <input type="url" value={codeUrl} onChange={(e) => setCodeUrl(e.target.value)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>playable url</span>
            <input type="url" value={playableUrl} onChange={(e) => setPlayableUrl(e.target.value)} required className={inputClass} />
          </label>
        </div>

        <HackatimeConnect onProjects={handleProjects} since={since} />

        {hackatimeConnected && (
          <div className="flex flex-col gap-1">
            <span className={labelClass}>hackatime project(s), hours since {sinceLabel}</span>
            <ProjectMultiSelect
              projects={projects}
              value={selectedProjects}
              onChange={(names) => setHackatimeProject(joinHackatimeProjects(names))}
            />
          </div>
        )}

        {hackatimeConnected && needsProjectDescriptions && (
          <div className="flex flex-col gap-2">
            <span className={labelClass}>what is each project?</span>
            {selectedProjects.map((name) => (
              <label key={name} className="flex flex-col gap-1">
                <span className="flex justify-between gap-3 text-xs font-mono">
                  <span className="text-ink truncate">{name}</span>
                  <span className="text-ink-soft shrink-0">
                    {formatProjectHours(projects.find((p) => p.name === name)?.totalSeconds ?? 0)}
                  </span>
                </span>
                <input
                  className={inputClass}
                  required
                  maxLength={300}
                  placeholder={`What is ${name}?`}
                  value={projectDescriptions[name] ?? ""}
                  onChange={(e) => setProjectDescriptions((d) => ({ ...d, [name]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className={labelClass}>what changed since your last ship? (min 10 characters)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={4}
            className={inputClass + " resize-none"}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>screenshot of the update</span>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>lapse hours since {sinceLabel} (optional)</span>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0"
            value={lapseHours}
            onChange={(e) => setLapseHours(e.target.value)}
            className={inputClass}
          />
          {parseFloat(lapseHours) > 0 && (
            <textarea
              required
              rows={2}
              placeholder="Links proving this time (commits, screenshots, notes) — comma-separated"
              value={lapseJustification}
              onChange={(e) => setLapseJustification(e.target.value)}
              className={inputClass + " resize-none"}
            />
          )}
        </label>

        {hackatimeConnected && (
          <p className={`text-sm font-mono ${newHours >= MIN_HOURS_FOR_UPDATE ? "text-ink" : "text-magenta"}`}>
            {formatProjectHours(newHours * 3600)} new, {MIN_HOURS_FOR_UPDATE} hrs needed
          </p>
        )}

        <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={noAiPledge}
            onChange={(e) => setNoAiPledge(e.target.checked)}
            required
            className="mt-1 w-4 h-4 shrink-0 accent-magenta"
          />
          <span>I didn&apos;t use AI to make this update, and I understand there are consequences if I did.</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={rulesPledge}
            onChange={(e) => setRulesPledge(e.target.checked)}
            required
            className="mt-1 w-4 h-4 shrink-0 accent-magenta"
          />
          <span>
            I&apos;ve read and followed the{" "}
            <a href="/docs/rules" target="_blank" rel="noopener noreferrer" className="underline">
              rules
            </a>
            .
          </span>
        </label>

        {!idVerified && (
          <p className="text-sm text-magenta">
            You need to be ID verified to ship. Verify at identity.hackclub.com, then sign out and back in.
          </p>
        )}
        {error && <p className="text-sm text-magenta">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          disabled={
            status === "submitting" ||
            !idVerified ||
            !user.slackId ||
            !user.address ||
            !hackatimeConnected ||
            selectedProjects.length === 0 ||
            missingProjectDescriptions ||
            !noAiPledge ||
            !rulesPledge
          }
          className="self-start"
        >
          {status === "submitting" ? "shipping..." : "ship update →"}
        </Button>
      </form>
    </Card>
  );
}
