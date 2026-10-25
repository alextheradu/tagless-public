import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { itemPriceInStamps } from "@/lib/rewards";
import type { ShopItemWithId } from "@/lib/types";

interface Props {
  item: ShopItemWithId;
}

export function ShopItemCard({ item }: Props) {
  const soldOut = !item["Unlimited Stock"] && item.Stock <= 0;
  const imageUrl = item.Image?.[0]?.url;
  const priceInStamps = itemPriceInStamps(item);

  return (
    <Card className={`relative overflow-hidden flex flex-col p-0 ${soldOut ? "opacity-50" : ""}`}>
      {item.Starred && (
        <span className="absolute top-2 left-2 z-10 bg-ink text-paper px-2 py-0.5 rounded-pill font-mono text-[11px]">
          ★ pinned
        </span>
      )}
      <Link
        href={soldOut ? "#" : `/shop/${item._id}`}
        className={`no-underline ${soldOut ? "pointer-events-none" : ""}`}
      >
        <div className="relative w-full h-64 bg-paper-warm border-b-[1.5px] border-ink overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
              className="object-contain"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center text-smoke text-sm font-mono">
              no image
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col gap-1">
          <p className="font-bold text-ink">{item.Name}</p>
          <p className="font-mono text-sm text-ink-soft">
            {soldOut ? "sold out" : `${priceInStamps} stamps`}
          </p>
        </div>
      </Link>
    </Card>
  );
}
