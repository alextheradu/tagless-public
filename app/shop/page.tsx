import { getSession } from "@/lib/auth";
import { getShopItems, getSubmissionsByEmail, getOrdersByEmail, getAdjustmentsByEmail } from "@/lib/airtable";
import { computeBalance, itemPriceInStamps, tagClaimableSubmission } from "@/lib/rewards";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ButtonLink } from "@/components/ui/Button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop: Tagless" };

export default async function ShopPage() {
  let user = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }

  const [items, submissions, orders, adjustments] = await Promise.all([
    getShopItems(),
    user ? getSubmissionsByEmail(user.email) : Promise.resolve([]),
    user ? getOrdersByEmail(user.email) : Promise.resolve([]),
    user ? getAdjustmentsByEmail(user.email).catch(() => []) : Promise.resolve([]),
  ]);

  const balance = user ? computeBalance(submissions, orders, adjustments) : null;
  const unclaimedApproved = tagClaimableSubmission(submissions);
  const sortedItems = [...items].sort((a, b) => {
    const starDiff = (b.Starred ? 1 : 0) - (a.Starred ? 1 : 0);
    return starDiff !== 0 ? starDiff : itemPriceInStamps(a) - itemPriceInStamps(b);
  });

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <EyebrowLabel className="mb-3 block">the shop</EyebrowLabel>
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.96 }}
          >
            {balance !== null ? `${balance} stamps` : "shop."}
          </h1>
        </div>
        {balance === null ? (
          <ButtonLink href="/api/auth/hackclub" variant="ghost" className="text-sm">
            log in to see your stamps →
          </ButtonLink>
        ) : (
          <ButtonLink href="/submit?orders=1" variant="ghost" className="text-sm">
            my orders →
          </ButtonLink>
        )}
      </div>

      {unclaimedApproved && (
        <Link
          href={`/claim/${unclaimedApproved._id}`}
          className="flex items-center justify-between gap-3 mb-10 px-5 py-3 rounded-md border-[1.5px] border-ink bg-highlight/30 no-underline hover:bg-highlight/50 transition-colors"
        >
          <span className="font-body font-semibold text-ink text-sm">
            your luggage tag is ready, claim it
          </span>
          <span className="font-mono text-xs text-ink">claim →</span>
        </Link>
      )}

      <ShopGrid items={sortedItems} />
    </div>
  );
}
