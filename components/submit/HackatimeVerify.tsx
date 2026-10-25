"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { CheckCircle, XCircle, Loader } from "lucide-react";

interface Props {
  onVerified: (apiKey: string, projects: string[]) => void;
}

export function HackatimeVerify({ onVerified }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [projects, setProjects] = useState<string[]>([]);

  async function verify() {
    setStatus("loading");
    try {
      const res = await fetch("/api/hackatime/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setStatus("ok");
        onVerified(apiKey, data.projects);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <EyebrowLabel>hackatime api key</EyebrowLabel>
      <p className="text-[13px] text-smoke">
        Find your key at{" "}
        <a href="https://hackatime.hackclub.com/my/wakatime_api_key" target="_blank" rel="noopener noreferrer" className="text-ink underline">
          hackatime.hackclub.com
        </a>
      </p>
      <div className="flex gap-3">
        <input
          type="password"
          placeholder="waka_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1 border-[1.5px] border-ink rounded-md px-4 py-3 font-mono text-sm bg-paper focus:outline-none focus:border-magenta"
        />
        <Button
          variant="ink"
          onClick={verify}
          disabled={!apiKey || status === "loading"}
        >
          {status === "loading" ? <Loader size={14} className="animate-spin" /> : "verify"}
        </Button>
      </div>
      {status === "ok" && (
        <p className="text-mint text-sm flex items-center gap-2">
          <CheckCircle size={14} /> Key valid: {projects.length} project{projects.length !== 1 ? "s" : ""} found
        </p>
      )}
      {status === "ok" && projects.length === 0 && (
        <p className="text-smoke text-sm">No projects found. Create a project in Hackatime first.</p>
      )}
      {status === "error" && (
        <p className="text-magenta text-sm flex items-center gap-2">
          <XCircle size={14} /> Invalid API key. Check and try again.
        </p>
      )}
    </div>
  );
}
