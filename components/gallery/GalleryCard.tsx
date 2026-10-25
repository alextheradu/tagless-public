import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { formatHours } from "@/lib/submissionDisplay";
import type { GalleryProject } from "@/lib/airtable";

function safeHref(url: string): string | null {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function GalleryCard({ project }: { project: GalleryProject }) {
  const demo = safeHref(project.playableUrl);
  const code = safeHref(project.codeUrl);

  return (
    <Card className="overflow-hidden flex flex-col p-0">
      <div className="relative w-full h-56 bg-paper-warm border-b-[1.5px] border-ink overflow-hidden flex items-center justify-center">
        {project.screenshotUrl ? (
          <Image
            src={project.screenshotUrl}
            alt={`screenshot of ${project.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover"
          />
        ) : (
          <span className="text-smoke text-sm font-mono">no image</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-ink text-lg break-words min-w-0">{project.name}</h2>
          <span className="font-mono text-xs text-ink bg-highlight/40 px-2 py-0.5 rounded-pill whitespace-nowrap">
            {formatHours(project.hours)}
          </span>
        </div>
        {project.builder && <p className="font-mono text-xs text-smoke">by {project.builder}</p>}
        <p className="text-ink-soft text-sm line-clamp-4 flex-1">{project.description}</p>
        <div className="flex gap-4 font-mono text-sm">
          {demo && (
            <a href={demo} target="_blank" rel="noopener noreferrer" className="text-magenta">
              demo ↗
            </a>
          )}
          {code && (
            <a href={code} target="_blank" rel="noopener noreferrer" className="text-magenta">
              code ↗
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
