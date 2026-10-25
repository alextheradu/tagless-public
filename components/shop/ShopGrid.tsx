"use client";
import { useMemo, useState } from "react";
import { ShopItemCard } from "./ShopItemCard";
import type { ShopItemWithId } from "@/lib/types";

interface Props {
  items: ShopItemWithId[];
}

export function ShopGrid({ items }: Props) {
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.Category).filter((c): c is string => !!c));
    return Array.from(set).sort();
  }, [items]);
  const [category, setCategory] = useState<string | "all">("all");
  const filtered = category === "all" ? items : items.filter((i) => i.Category === category);

  return (
    <>
      {categories.length > 0 && (
        <div className="flex gap-1 mb-8 flex-wrap">
          {(["all", ...categories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-pill font-mono text-[13px] border-[1.5px] transition-colors ${
                category === c
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink-soft border-bone hover:border-ink"
              }`}
            >
              {c.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-smoke text-sm py-16 text-center">Nothing in this category.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filtered.map((item) => (
            <ShopItemCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
