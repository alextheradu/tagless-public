import { getSession } from "@/lib/auth";
import {
  getSubmissionsByEmail,
  getOrdersByEmail,
  getAdjustmentsByEmail,
  getShopItem,
  getSubmissionWindow,
} from "@/lib/airtable";
import { isSubmissionsOpen } from "@/lib/submissionWindow";
import { SubmitForm } from "@/components/submit/SubmitForm";
import { SubmissionsGrid } from "@/components/dashboard/SubmissionsGrid";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Submit: Tagless" };

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; hackatime_error?: string }>;
}) {
  const params = await searchParams;
  let user = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }

  const submissionsOpen = isSubmissionsOpen(await getSubmissionWindow().catch(() => ({ open: null, close: null })));

  let submissions: Awaited<ReturnType<typeof getSubmissionsByEmail>> = [];
  let orders: Awaited<ReturnType<typeof getOrdersByEmail>> = [];
  let adjustments: Awaited<ReturnType<typeof getAdjustmentsByEmail>> = [];
  let itemImages: Record<string, string> = {};
  if (user) {
    [submissions, orders, adjustments] = await Promise.all([
      getSubmissionsByEmail(user.email).catch(() => []),
      getOrdersByEmail(user.email).catch(() => []),
      getAdjustmentsByEmail(user.email).catch(() => []),
    ]);
    adjustments = adjustments.map((a) => ({ ...a, Reason: "", "Created By": "" }));

    const itemIds = Array.from(new Set(orders.map((o) => o.Item?.[0]).filter(Boolean))) as string[];
    const items = await Promise.all(itemIds.map((id) => getShopItem(id).catch(() => null)));
    itemImages = Object.fromEntries(
      items
        .filter((item): item is NonNullable<typeof item> => !!item?.Image?.[0]?.url)
        .map((item) => [item._id, item.Image![0].url])
    );
  }

  if (user) {
    return (
      <SubmissionsGrid
        user={user}
        submissions={submissions}
        orders={orders}
        adjustments={adjustments}
        itemImages={itemImages}
        submissionsOpen={submissionsOpen}
      />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <EyebrowLabel className="mb-4 block">submit your project</EyebrowLabel>
      <h1
        className="font-display text-ink mb-12"
        style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96 }}
      >
        ship it.
      </h1>
      {submissionsOpen ? (
        <SubmitForm user={user} error={params.error} hackatimeError={params.hackatime_error} />
      ) : (
        <p className="text-center text-ink-soft text-sm max-w-[520px] mx-auto">
          Submissions are closed right now.
        </p>
      )}
    </div>
  );
}
