"use client";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { CheckCircle, Loader } from "lucide-react";

export interface HackatimeProject {
  name: string;
  totalSeconds: number;
}

interface Props {
  onProjects: (projects: HackatimeProject[]) => void;
  hackatimeError?: string;
  since?: string;
}

export function HackatimeConnect({ onProjects, hackatimeError, since }: Props) {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [projects, setProjects] = useState<HackatimeProject[]>([]);

  useEffect(() => {
    fetch(since ? `/api/hackatime/projects?since=${encodeURIComponent(since)}` : "/api/hackatime/projects")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        const p: HackatimeProject[] = data.projects ?? [];
        setProjects(p);
        setStatus("connected");
        onProjects(p);
      })
      .catch(() => setStatus("disconnected"));
  }, [onProjects, since]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader size={14} className="animate-spin" /> Checking Hackatime...
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex flex-col gap-2">
        <EyebrowLabel>hackatime</EyebrowLabel>
        <p className="text-mint text-sm flex items-center gap-2">
          <CheckCircle size={14} /> Connected: {projects.length} project{projects.length !== 1 ? "s" : ""} found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <EyebrowLabel>hackatime</EyebrowLabel>
      {hackatimeError && (
        <p className="text-magenta text-sm">Connection failed. Please try again.</p>
      )}
      <p className="text-[13px] text-smoke">
        Connect your Hackatime account to verify your hours.
      </p>
      <ButtonLink href="/api/hackatime/oauth/authorize" variant="ink" className="self-center">
        Connect Hackatime →
      </ButtonLink>
    </div>
  );
}
