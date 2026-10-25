import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getShopItem, getSubmissionsByEmail, getOrdersByEmail, getAdjustmentsByEmail } from "@/lib/airtable";
import { computeBalance } from "@/lib/rewards";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout: Tagless" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  let user = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }
  if (!user) redirect(`/api/auth/hackclub?returnTo=${encodeURIComponent(`/shop/${itemId}`)}`);

  const item = await getShopItem(itemId);
  if (!item || !item.Active) notFound();

  const [submissions, orders, adjustments] = await Promise.all([
    getSubmissionsByEmail(user.email),
    getOrdersByEmail(user.email),
    getAdjustmentsByEmail(user.email).catch(() => []),
  ]);
  const balance = computeBalance(submissions, orders, adjustments);

  return <CheckoutForm item={item} balance={balance} address={user.address ?? null} />;
}
