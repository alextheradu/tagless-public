import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, type HackclubAddress } from "@/lib/auth";
import {
  getShopItemFresh,
  createShopOrder,
  getOrdersByEmail,
  getAdjustmentsByEmail,
  getSubmissionsByEmail,
} from "@/lib/airtable";
import { computeBalance, itemPriceInStamps } from "@/lib/rewards";

const lineSchema = z.object({
  label: z.string().min(1).optional(),
  quantity: z.number().int().min(1),
});

const schema = z.object({
  itemId: z.string().min(1),
  lines: z.array(lineSchema).min(1).max(20),
  fulfillmentNotes: z.string().max(2000).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await getOrdersByEmail(session.user.email);
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { itemId, lines, fulfillmentNotes } = parsed.data;

  const item = await getShopItemFresh(itemId);
  if (!item || !item.Active) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const hasVariants = (item.Variants?.length ?? 0) > 0;

  const mergedByLabel = new Map<string, number>();
  for (const line of lines) {
    const key = line.label ?? "";
    mergedByLabel.set(key, (mergedByLabel.get(key) ?? 0) + line.quantity);
  }

  type ResolvedLine = {
    quantity: number;
    stampsSpent: number;
    label?: string;
    variantId?: string;
    remainingVariantStock?: number;
  };
  const resolvedLines: ResolvedLine[] = [];

  if (hasVariants) {
    for (const [label, quantity] of mergedByLabel) {
      if (!label) {
        return NextResponse.json({ error: "Pick an option for this item." }, { status: 400 });
      }
      const variant = item.Variants!.find((v) => v.Label === label);
      if (!variant) {
        return NextResponse.json({ error: `"${label}" isn't an option for this item.` }, { status: 400 });
      }
      if (variant.Stock !== undefined && quantity > variant.Stock) {
        return NextResponse.json(
          { error: `Not enough "${label}" left in stock` },
          { status: 400 }
        );
      }
      resolvedLines.push({
        quantity,
        label,
        variantId: variant._id,
        remainingVariantStock: variant.Stock !== undefined ? variant.Stock - quantity : undefined,
        stampsSpent: itemPriceInStamps(item, variant) * quantity,
      });
    }
  } else {
    if (mergedByLabel.size !== 1 || mergedByLabel.has("") === false) {
      return NextResponse.json(
        { error: "This item doesn't have any options." },
        { status: 400 }
      );
    }
    const quantity = mergedByLabel.get("")!;
    resolvedLines.push({ quantity, stampsSpent: itemPriceInStamps(item) * quantity });
  }

  const trackedQuantity = item["Unlimited Stock"]
    ? 0
    : resolvedLines
        .filter((l) => l.remainingVariantStock !== undefined || !l.label)
        .reduce((sum, l) => sum + l.quantity, 0);
  if (trackedQuantity > item.Stock) {
    return NextResponse.json({ error: "Not enough stock left" }, { status: 400 });
  }

  let shippingAddress: string | undefined;
  if (item["Is Physical"]) {
    if (!session.user.address) {
      return NextResponse.json(
        { error: "Authorize Tagless to view your Hack Club address first." },
        { status: 400 }
      );
    }
    shippingAddress = formatAddress(session.user.address);
  }

  const [submissions, orders, adjustments] = await Promise.all([
    getSubmissionsByEmail(session.user.email),
    getOrdersByEmail(session.user.email),
    getAdjustmentsByEmail(session.user.email),
  ]);
  const balance = computeBalance(submissions, orders, adjustments);
  const totalCost = resolvedLines.reduce((sum, l) => sum + l.stampsSpent, 0);
  if (balance < totalCost) {
    return NextResponse.json({ error: "Not enough Stamps" }, { status: 400 });
  }

  await createShopOrder({
    buyerEmail: session.user.email,
    buyerName: session.user.name,
    itemId: item._id,
    itemName: item.Name,
    remainingItemStock: item.Stock - trackedQuantity,
    lines: resolvedLines,
    shippingAddress,
    fulfillmentNotes: fulfillmentNotes?.trim() || undefined,
  });

  return NextResponse.json({ ok: true });
}

function formatAddress(address: HackclubAddress): string {
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
  return lines.join("\n");
}
