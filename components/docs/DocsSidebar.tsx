import Link from "next/link";
import type { DocMeta } from "@/lib/docs";
import { cn } from "@/lib/utils";

interface Props {
  docs: DocMeta[];
  currentSlug: string;
}

export function DocsSidebar({ docs, currentSlug }: Props) {
  const grouped = docs.reduce<Record<string, DocMeta[]>>((acc, doc) => {
    (acc[doc.category] ??= []).push(doc);
    return acc;
  }, {});

  return (
    <aside className="w-full lg:w-56 flex-shrink-0 lg:sticky lg:top-16 self-start pt-2 lg:pt-8 pb-4 lg:pb-16">
      <nav className="flex flex-col gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-smoke mb-3">
              {category}
            </p>
            <ul className="flex flex-col gap-1">
              {items.map((doc) => {
                const isActive = doc.slug.join("/") === currentSlug;
                return (
                  <li key={doc.href}>
                    <Link
                      href={doc.href}
                      className={cn(
                        "block px-3 py-2 rounded-sm text-[14px] no-underline transition-colors",
                        isActive
                          ? "bg-magenta text-white font-semibold"
                          : "text-ink-soft hover:text-ink hover:bg-paper-warm"
                      )}
                    >
                      {doc.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
