export function Note({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border-[1.5px] border-ink rounded-md bg-paper-warm px-5 py-4 my-6 shadow-hard text-[15px] [&_p]:mb-0 [&_p:not(:last-child)]:mb-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-magenta block mb-1.5">
        note
      </span>
      {children}
    </aside>
  );
}
