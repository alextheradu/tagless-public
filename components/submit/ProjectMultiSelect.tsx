"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { HackatimeProject } from "./HackatimeConnect";
import { MAX_HACKATIME_PROJECTS } from "@/lib/hackatimeProjects";

interface Props {
  projects: HackatimeProject[];
  value: string[];
  onChange: (names: string[]) => void;
}

export function formatProjectHours(totalSeconds: number): string {
  return `${Math.round((totalSeconds / 3600) * 10) / 10} hrs`;
}

export function ProjectMultiSelect({ projects, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const options = useMemo(() => {
    const known = new Set(projects.map((p) => p.name));
    const missing = value.filter((name) => !known.has(name)).map((name) => ({ name, totalSeconds: 0 }));
    return [...projects, ...missing];
  }, [projects, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((p) => p.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const selected = new Set(value);
  const atLimit = value.length >= MAX_HACKATIME_PROJECTS;
  const selectedSeconds = options
    .filter((p) => selected.has(p.name))
    .reduce((sum, p) => sum + p.totalSeconds, 0);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    searchRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  function toggle(name: string) {
    if (selected.has(name)) onChange(value.filter((n) => n !== name));
    else if (!atLimit) onChange([...value, name]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[active];
      if (option) toggle(option.name);
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 border-[1.5px] rounded-md px-4 py-3 font-body text-sm bg-paper text-left transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:border-magenta focus-visible:shadow-[0_0_0_4px_rgba(255,45,111,0.12)] ${open ? "border-magenta shadow-[0_0_0_4px_rgba(255,45,111,0.12)]" : "border-ink"}`}
      >
        <span className={`flex-1 truncate ${value.length ? "text-ink" : "text-smoke"}`}>
          {value.length === 0
            ? "Select one or more projects"
            : value.length === 1
              ? value[0]
              : `${value.length} projects selected`}
        </span>
        {value.length > 0 && (
          <span className="font-mono text-xs text-ink-soft shrink-0">{formatProjectHours(selectedSeconds)}</span>
        )}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {value.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 border-[1.5px] border-ink rounded-pill pl-2.5 pr-1 py-0.5 text-xs font-mono bg-paper"
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => toggle(name)}
                className="rounded-full p-0.5 hover:bg-magenta-soft"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-2 border-[1.5px] border-ink rounded-md bg-paper shadow-hard overflow-hidden">
          {options.length > 6 && (
            <div className="border-b-[1.5px] border-ink/15 p-2">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-controls={listId}
                className="w-full px-3 py-2 text-sm bg-transparent placeholder:text-smoke focus:outline-none"
              />
            </div>
          )}
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-smoke">No matching projects</li>}
            {filtered.map((p, i) => {
              const isSelected = selected.has(p.name);
              const disabled = !isSelected && atLimit;
              return (
                <li
                  key={p.name}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => toggle(p.name)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer select-none ${i === active ? "bg-magenta-soft/40" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`w-4 h-4 shrink-0 rounded-[4px] border-[1.5px] border-ink flex items-center justify-center ${isSelected ? "bg-magenta border-magenta text-paper" : "bg-paper"}`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-mono text-xs text-ink-soft shrink-0">
                    {p.totalSeconds > 0 ? formatProjectHours(p.totalSeconds) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
          {atLimit && (
            <p className="border-t-[1.5px] border-ink/15 px-4 py-2 text-xs text-smoke">
              Max {MAX_HACKATIME_PROJECTS} projects per submission.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
