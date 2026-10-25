import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getShopOrderById, cancelShopOrder } from "@/lib/airtable";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getShopOrderById(id);
  if (!order || order["Buyer Email"] !== session.user.email) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.Status !== "Pending") {
    return NextResponse.json(
      { error: "Only pending orders can be canceled." },
      { status: 400 }
    );
  }

  await cancelShopOrder(order);
  return NextResponse.json({ ok: true });
}
