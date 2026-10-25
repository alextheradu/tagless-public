"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { itemPriceInStamps } from "@/lib/rewards";
import type { HackclubAddress } from "@/lib/auth";
import type { ShopItemWithId } from "@/lib/types";

const PHYSICAL_DISCLAIMER =
  "We will ship this item to the address you select. Hack Club is not in charge of any customs or taxes from your package arriving at your country. If we're not able to ship your item, we'll reach out about other options.";

interface Props {
  item: ShopItemWithId;
  balance: number;
  address: HackclubAddress | null;
}

export function CheckoutForm({ item, balance, address }: Props) {
  const router = useRouter();
  const hasVariants = (item.Variants?.length ?? 0) > 0;
  const variantByLabel = new Map((item.Variants ?? []).map((v) => [v.Label, v]));
  const [singleQty, setSingleQty] = useState(1);
  const [optionQty, setOptionQty] = useState<Record<string, number>>(() =>
    Object.fromEntries((item.Variants ?? []).map((v) => [v.Label, 0]))
  );
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const lines: { label?: string; quantity: number }[] = hasVariants
    ? Object.entries(optionQty)
        .filter(([, qty]) => qty > 0)
        .map(([label, qty]) => ({ label, quantity: qty }))
    : [{ quantity: singleQty }];
  const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  const lineCosts = lines.map((l) => ({
    ...l,
    stamps: itemPriceInStamps(item, l.label ? variantByLabel.get(l.label) : undefined) * l.quantity,
  }));
  const total = lineCosts.reduce((sum, l) => sum + l.stamps, 0);

  const needsAddress = item["Is Physical"];
  const hasAddress = !needsAddress || address !== null;
  const stockOk = hasVariants
    ? lines.every((l) => {
        const v = variantByLabel.get(l.label!);
        return !!v && (v.Stock === undefined || l.quantity <= v.Stock);
      })
    : item["Unlimited Stock"] || quantity <= item.Stock;
  const canBuy = hasAddress && quantity > 0 && stockOk && total <= balance;
  const imageUrl = item.Image?.[0]?.url;

  async function buy() {
    setStatus("submitting");
    setErrorMsg("");
    const res = await fetch("/api/shop/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item._id,
        lines,
        fulfillmentNotes: fulfillmentNotes.trim() || undefined,
      }),
    });
    if (res.ok) {
      router.push("/submit");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">
      <EyebrowLabel className="mb-4 block">complete your order</EyebrowLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative w-full h-96 bg-paper-warm border-[1.5px] border-ink rounded-xl overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 450px"
              className="object-contain"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-smoke text-sm font-mono">
              no image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="font-display text-3xl text-ink mb-2">{item.Name}</p>
            <p className="text-sm text-ink-soft">{item.Description}</p>
            {item["Sub-Description"] && (
              <p className="text-xs text-smoke mt-2">{item["Sub-Description"]}</p>
            )}
            {item["Is Physical"] && (
              <p className="text-xs text-smoke mt-2">{PHYSICAL_DISCLAIMER}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <EyebrowLabel>{hasVariants ? "options" : "quantity"}</EyebrowLabel>
            {hasVariants ? (
              <div className="flex flex-col gap-2">
                {item.Variants!.map((v) => {
                  const stampsForThis = itemPriceInStamps(item, v);
                  const soldOut = v.Stock !== undefined && v.Stock <= 0;
                  return (
                    <div
                      key={v._id}
                      className="flex items-center justify-between gap-3 border-[1.5px] border-ink rounded-md px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{v.Label}</p>
                        <p className="text-xs text-smoke">
                          {soldOut ? "sold out" : `${stampsForThis} stamps`}
                          {v.Stock !== undefined && !soldOut ? ` · ${v.Stock} left` : ""}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={v.Stock}
                        value={optionQty[v.Label] ?? 0}
                        disabled={soldOut}
                        onChange={(e) =>
                          setOptionQty((prev) => ({
                            ...prev,
                            [v.Label]: Math.max(
                              0,
                              Math.min(v.Stock ?? Infinity, parseInt(e.target.value, 10) || 0)
                            ),
                          }))
                        }
                        className="w-20 border-[1.5px] border-ink rounded-md px-3 py-2 font-body text-sm bg-paper text-center disabled:opacity-50"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <input
                  type="number"
                  min={1}
                  max={item["Unlimited Stock"] ? undefined : item.Stock}
                  value={singleQty}
                  onChange={(e) =>
                    setSingleQty(
                      Math.max(
                        1,
                        Math.min(
                          item["Unlimited Stock"] ? Infinity : item.Stock,
                          parseInt(e.target.value, 10) || 1
                        )
                      )
                    )
                  }
                  className="w-full border-[1.5px] border-ink rounded-md px-4 py-3 font-body text-sm bg-paper"
                />
                <p className="text-xs text-smoke">
                  {item["Unlimited Stock"] ? "unlimited stock" : `${item.Stock} left in stock`}
                </p>
              </>
            )}
          </div>

          {needsAddress && (
            <Card className="p-4 flex flex-col gap-3">
              <EyebrowLabel>shipping address</EyebrowLabel>
              {address ? (
                <p className="text-sm text-ink-soft leading-relaxed">
                  {address.line1}
                  {address.line2 ? <><br />{address.line2}</> : null}
                  <br />
                  {[address.city, address.state, address.zip].filter(Boolean).join(", ")}
                  <br />
                  {address.country}
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    We pull your shipping address from your Hack Club account. Authorize
                    Tagless to view it to continue.
                  </p>
                  <ButtonLink
                    variant="ink"
                    href={`/api/auth/hackclub?returnTo=${encodeURIComponent(`/shop/${item._id}`)}`}
                    className="self-start"
                  >
                    Authorize Tagless to view your address
                  </ButtonLink>
                </>
              )}
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <EyebrowLabel>fulfillment notes (optional)</EyebrowLabel>
            <textarea
              value={fulfillmentNotes}
              onChange={(e) => setFulfillmentNotes(e.target.value)}
              rows={3}
              placeholder={
                needsAddress
                  ? "e.g. preferred size/color, a suggested retailer/link if it's hard to find"
                  : "e.g. the HCB grant email to send this to, or an account/username to redeem it on"
              }
              className="w-full border-[1.5px] border-ink rounded-md px-4 py-3 font-body text-sm bg-paper placeholder:text-smoke resize-none"
            />
            <p className="text-xs text-smoke">
              Anything that'll help us actually get this to you correctly.
            </p>
          </div>

          <Card className="p-4 flex flex-col gap-2">
            {hasVariants ? (
              lineCosts.map((l) => (
                <div key={l.label} className="flex justify-between text-sm">
                  <span className="text-ink-soft">
                    {l.label} x{l.quantity}
                  </span>
                  <span className="font-mono text-ink">{l.stamps} stamps</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">base price</span>
                  <span className="font-mono text-ink">{itemPriceInStamps(item)} stamps</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">quantity</span>
                  <span className="font-mono text-ink">{quantity}x</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-bone">
              <span className="text-ink font-medium">total</span>
              <span className="font-mono text-ink font-bold">{total} stamps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">current balance</span>
              <span className="font-mono text-ink">{balance} stamps</span>
            </div>
          </Card>

          {hasAddress && total > balance && (
            <p className="text-magenta text-sm">You need {total - balance} more Stamps.</p>
          )}
          {status === "error" && <p className="text-magenta text-sm">{errorMsg}</p>}

          <Button
            variant="primary"
            onClick={buy}
            disabled={!canBuy || status === "submitting"}
            className="self-start"
          >
            {status === "submitting" ? "buying..." : `buy for ${total} stamps`}
          </Button>
        </div>
      </div>
    </div>
  );
}
