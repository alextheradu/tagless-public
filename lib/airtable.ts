import Airtable from "airtable";
import { unstable_cache } from "next/cache";
import { randomUUID } from "crypto";
import type {
  AirtableRecord,
  AirtableRecordWithId,
  LoginWithId,
  ReviewOps,
  ReviewOpsWithId,
  ShopItem,
  ShopItemWithId,
  ShopItemVariant,
  ShopItemVariantWithId,
  ShopOrder,
  ShopOrderWithId,
  StampAdjustment,
  StampAdjustmentWithId,
} from "./types";
import type { SubmissionWindow } from "./submissionWindow";
import { hackerView, isFullyApproved } from "./submissionStatus";
import { effectiveHours } from "./rewards";
import { sumHours } from "./submissionHours";
import { projectNameFor } from "@/lib/submissionDisplay";

let _base: Airtable.Base | null = null;
function base(table: string) {
  if (!_base) {
    _base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY, requestTimeout: 20_000 }).base(
      process.env.AIRTABLE_BASE_ID!
    );
  }
  return _base(table);
}

const TABLE = "YSWS Project Submission";
const DRAFTS_TABLE = "Submission Drafts";
const QUEUE_TABLE = "Submission Queue";

function escapeFormula(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface RawAirtableRecord {
  id: string;
  fields: unknown;
  _rawJson: { createdTime: string };
}

function toRecordWithId(r: RawAirtableRecord): AirtableRecordWithId {
  return {
    ...(r.fields as AirtableRecord),
    _id: r.id,
    _createdTime: r._rawJson.createdTime,
  };
}

export async function createQueueSubmission(
  record: Omit<
    AirtableRecord,
    | "Status"
    | "Notes"
    | "Optional - Override Hours Spent"
    | "Optional - Override Hours Spent Justification"
    | "Automation - Submit to Unified YSWS"
    | "Screenshot"
  >
): Promise<AirtableRecordWithId> {
  const created = await base(QUEUE_TABLE).create(
    { ...record, Status: "Pending" },
    { typecast: true }
  );
  return toRecordWithId(created as unknown as RawAirtableRecord);
}

export async function finalizeDraftSubmission(
  draftId: string,
  record: Omit<
    AirtableRecord,
    | "Status"
    | "Notes"
    | "Optional - Override Hours Spent"
    | "Optional - Override Hours Spent Justification"
    | "Automation - Submit to Unified YSWS"
    | "Screenshot"
  >
): Promise<AirtableRecordWithId> {
  const created = await base(QUEUE_TABLE).create(
    { ...record, Status: "Pending" },
    { typecast: true }
  );
  await base(DRAFTS_TABLE).destroy(draftId);
  return toRecordWithId(created as unknown as RawAirtableRecord);
}

export async function uploadScreenshot(
  recordId: string,
  base64: string,
  filename: string,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(
      "Screenshot"
    )}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType, file: base64, filename }),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable screenshot upload failed: ${res.status} ${text}`);
  }
}

function toDraftRecordWithId(r: RawAirtableRecord): AirtableRecordWithId {
  return { ...toRecordWithId(r), Status: "Draft" };
}

async function allByEmail(table: string, email: string) {
  return base(table)
    .select({ filterByFormula: `{Email} = "${escapeFormula(email)}"` })
    .all();
}

export async function getSubmissionsByEmail(
  email: string
): Promise<AirtableRecordWithId[]> {
  const [main, queue, drafts] = await Promise.all([
    allByEmail(TABLE, email),
    allByEmail(QUEUE_TABLE, email),
    allByEmail(DRAFTS_TABLE, email),
  ]);
  return [
    ...main.map((r) => hackerView(toRecordWithId(r as unknown as RawAirtableRecord))),
    ...queue.map((r) => hackerView(toRecordWithId(r as unknown as RawAirtableRecord))),
    ...drafts.map((r) => toDraftRecordWithId(r as unknown as RawAirtableRecord)),
  ].sort((a, b) => b._createdTime.localeCompare(a._createdTime));
}

export async function getSubmissionById(
  id: string
): Promise<AirtableRecordWithId | null> {
  try {
    const record = toRecordWithId((await base(TABLE).find(id)) as unknown as RawAirtableRecord);
    return record.Status ? record : { ...record, Status: "Draft" };
  } catch {
  }
  try {
    const record = toRecordWithId((await base(QUEUE_TABLE).find(id)) as unknown as RawAirtableRecord);
    return record.Status ? record : { ...record, Status: "Draft" };
  } catch {
  }
  try {
    return toDraftRecordWithId((await base(DRAFTS_TABLE).find(id)) as unknown as RawAirtableRecord);
  } catch {
    return null;
  }
}

export interface GalleryProject {
  id: string;
  name: string;
  description: string;
  playableUrl: string;
  codeUrl: string;
  hours: number;
  screenshotUrl: string | null;
  builder: string | null;
}

export const getGalleryProjects = unstable_cache(
  async (): Promise<GalleryProject[]> => {
    const records = await base(TABLE)
      .select({
        filterByFormula: `AND({Status} = "Approved", {Unified Synced At} != "")`,
      })
      .all();
    const approved = records
      .map((r) => toRecordWithId(r as unknown as RawAirtableRecord))
      .filter(isFullyApproved)
      .sort((a, b) => (b["Unified Synced At"] ?? "").localeCompare(a["Unified Synced At"] ?? ""));
    const updateHours = new Map<string, number>();
    for (const s of approved) {
      const rootId = s["Update Of"];
      if (rootId) updateHours.set(rootId, (updateHours.get(rootId) ?? 0) + effectiveHours(s));
    }
    const projects = approved.filter((s) => !s["Update Of"]);
    return projects
      .map((s) => ({
        id: s._id,
        name: projectNameFor(s),
        description: s.Description ?? "",
        playableUrl: s["Playable URL"] ?? "",
        codeUrl: s["Code URL"] ?? "",
        hours: sumHours(effectiveHours(s), updateHours.get(s._id) ?? 0),
        screenshotUrl: s.Screenshot?.[0]?.url ?? null,
        builder: null,
      }));
  },
  ["gallery-projects"],
  { revalidate: 60 }
);

export type DraftFields = Partial<
  Pick<
    AirtableRecord,
    | "First Name"
    | "Last Name"
    | "Email"
    | "GitHub Username"
    | "Slack Handle"
    | "Code URL"
    | "Playable URL"
    | "Hackatime Project"
    | "Hackatime Project Breakdown"
    | "Description"
    | "How did you hear about this?"
    | "What are we doing well?"
    | "How can we improve?"
    | "Normal Coding Hours"
    | "AI Coding Hours"
    | "Lapse Hours"
    | "Justification - Specific Technical Features"
    | "Justification - Deflation Justification"
    | "Justification - Additional Justification"
    | "ID Verification Status"
  >
>;

export async function createDraftSubmission(
  fields: DraftFields
): Promise<AirtableRecordWithId> {
  const created = await base(DRAFTS_TABLE).create(fields, { typecast: true });
  return toDraftRecordWithId(created as unknown as RawAirtableRecord);
}

export async function updateDraftSubmission(
  id: string,
  fields: DraftFields
): Promise<AirtableRecordWithId> {
  const updated = await base(DRAFTS_TABLE).update(id, fields, { typecast: true });
  return toDraftRecordWithId(updated as unknown as RawAirtableRecord);
}

export async function deleteDraftSubmission(id: string): Promise<void> {
  await base(DRAFTS_TABLE).destroy(id);
}

type SubmissionUpdateFields = Partial<
  Pick<
    AirtableRecord,
    | "Status"
    | "Notes"
    | "Optional - Override Hours Spent"
    | "Optional - Override Hours Spent Justification"
    | "Automation - Submit to Unified YSWS"
    | "Unified Synced At"
    | "Tag Claimed"
    | "Tag Claimed At"
    | "Address (Line 1)"
    | "Address (Line 2)"
    | "City"
    | "State / Province"
    | "Country"
    | "ZIP / Postal Code"
    | "Code URL"
    | "Playable URL"
    | "GitHub Username"
    | "Description"
    | "Hackatime Project"
    | "Hackatime Project Breakdown"
    | "Normal Coding Hours"
    | "AI Coding Hours"
    | "Lapse Hours"
    | "Justification - Lapse Links, comma-separated"
    | "Justification - Specific Technical Features"
    | "Justification - Deflation Justification"
    | "Justification - Additional Justification"
    | "Justification - Submitter Hackatime ID"
    | "Justification - Hackatime Project Name(s) + Date Range(s)"
  >
>;

export async function updateSubmission(
  id: string,
  fields: SubmissionUpdateFields,
  options: { typecast?: boolean } = {}
): Promise<void> {
  try {
    await base(QUEUE_TABLE).update(id, fields as any, options);
  } catch {
    await base(TABLE).update(id, fields as any, options);
  }
}

const REVIEW_OPS_TABLE = "Review Ops";

function toReviewOpsWithId(r: RawAirtableRecord): ReviewOpsWithId {
  return { ...(r.fields as ReviewOps), _id: r.id };
}

async function findReviewOpsBySubmissionId(
  submissionId: string
): Promise<ReviewOpsWithId | null> {
  const records = await base(REVIEW_OPS_TABLE)
    .select({ filterByFormula: `{Submission ID} = "${escapeFormula(submissionId)}"`, maxRecords: 1 })
    .firstPage();
  return records[0] ? toReviewOpsWithId(records[0] as unknown as RawAirtableRecord) : null;
}

export async function upsertReviewOps(
  submissionId: string,
  fields: Partial<Omit<ReviewOps, "Submission ID">>
): Promise<ReviewOpsWithId> {
  const existing = await findReviewOpsBySubmissionId(submissionId);
  if (existing) {
    const updated = await base(REVIEW_OPS_TABLE).update(existing._id, fields as any);
    return toReviewOpsWithId(updated as unknown as RawAirtableRecord);
  }
  const created = await base(REVIEW_OPS_TABLE).create({
    "Submission ID": submissionId,
    ...fields,
  } as any);
  return toReviewOpsWithId(created as unknown as RawAirtableRecord);
}

export async function getReviewOpsBySubmissionId(
  submissionId: string
): Promise<ReviewOpsWithId | null> {
  return findReviewOpsBySubmissionId(submissionId);
}

export async function repointReviewOps(oldSubmissionId: string, newSubmissionId: string): Promise<void> {
  const existing = await findReviewOpsBySubmissionId(oldSubmissionId);
  if (existing) {
    await base(REVIEW_OPS_TABLE).update(existing._id, { "Submission ID": newSubmissionId });
  }
}

const SHOP_ITEMS_TABLE = "Shop Items";
const SHOP_ORDERS_TABLE = "Shop Orders";
const SHOP_ITEM_VARIANTS_TABLE = "Shop Item Variants";

function toShopItemWithId(r: RawAirtableRecord): ShopItemWithId {
  return { ...(r.fields as ShopItem), _id: r.id };
}

function toShopOrderWithId(r: RawAirtableRecord): ShopOrderWithId {
  return {
    ...(r.fields as ShopOrder),
    _id: r.id,
    _createdTime: r._rawJson.createdTime,
  };
}

function toShopItemVariantWithId(r: RawAirtableRecord): ShopItemVariantWithId {
  return { ...(r.fields as ShopItemVariant), _id: r.id };
}

async function getVariantsForItem(itemId: string): Promise<ShopItemVariantWithId[]> {
  const records = await base(SHOP_ITEM_VARIANTS_TABLE).select().all();
  return records
    .map((r) => toShopItemVariantWithId(r as unknown as RawAirtableRecord))
    .filter((v) => v.Item?.includes(itemId));
}

export const getShopItems = unstable_cache(
  async (): Promise<ShopItemWithId[]> => {
    const records = await base(SHOP_ITEMS_TABLE)
      .select({ filterByFormula: "{Active} = TRUE()" })
      .all();
    return records.map((r) => toShopItemWithId(r as unknown as RawAirtableRecord));
  },
  ["shop-items"],
  { revalidate: 60 }
);

export const getShopItem = unstable_cache(
  async (id: string): Promise<ShopItemWithId | null> => getShopItemFresh(id),
  ["shop-item"],
  { revalidate: 60 }
);

export async function getShopItemFresh(id: string): Promise<ShopItemWithId | null> {
  try {
    const record = await base(SHOP_ITEMS_TABLE).find(id);
    const item = toShopItemWithId(record as unknown as RawAirtableRecord);
    item.Variants = (await getVariantsForItem(id)).sort(
      (a, b) => (a.Price ?? item.Price) - (b.Price ?? item.Price)
    );
    return item;
  } catch {
    return null;
  }
}

export async function createShopOrder(order: {
  buyerEmail: string;
  buyerName: string;
  itemId: string;
  itemName: string;
  remainingItemStock: number;
  lines: {
    quantity: number;
    stampsSpent: number;
    label?: string;
    variantId?: string;
    remainingVariantStock?: number;
  }[];
  shippingAddress?: string;
  fulfillmentNotes?: string;
}): Promise<void> {
  await base(SHOP_ITEMS_TABLE).update(order.itemId, { Stock: order.remainingItemStock });
  await Promise.all(
    order.lines
      .filter((l) => l.variantId && l.remainingVariantStock !== undefined)
      .map((l) =>
        base(SHOP_ITEM_VARIANTS_TABLE).update(l.variantId!, { Stock: l.remainingVariantStock! })
      )
  );
  const orderGroup = order.lines.length > 1 ? randomUUID() : undefined;
  await Promise.all(
    order.lines.map((l) =>
      base(SHOP_ORDERS_TABLE).create({
        "Buyer Email": order.buyerEmail,
        "Buyer Name": order.buyerName,
        Item: [order.itemId],
        "Item Name": order.itemName,
        Quantity: l.quantity,
        "Total Stamps Spent": l.stampsSpent,
        Status: "Pending",
        Label: l.label,
        "Order Group": orderGroup,
        "Shipping Address": order.shippingAddress,
        "Fulfillment Notes": order.fulfillmentNotes,
      })
    )
  );
}

export async function getOrdersByEmail(email: string): Promise<ShopOrderWithId[]> {
  const records = await base(SHOP_ORDERS_TABLE)
    .select({ filterByFormula: `{Buyer Email} = "${escapeFormula(email)}"` })
    .all();
  return records
    .map((r) => toShopOrderWithId(r as unknown as RawAirtableRecord))
    .sort((a, b) => b._createdTime.localeCompare(a._createdTime));
}

export async function getShopOrderById(id: string): Promise<ShopOrderWithId | null> {
  try {
    const record = await base(SHOP_ORDERS_TABLE).find(id);
    return toShopOrderWithId(record as unknown as RawAirtableRecord);
  } catch {
    return null;
  }
}

export async function cancelShopOrder(order: ShopOrderWithId): Promise<void> {
  const itemId = order.Item?.[0];
  if (itemId) {
    const item = await getShopItemFresh(itemId);
    if (item) {
      const variant = order.Label ? item.Variants?.find((v) => v.Label === order.Label) : undefined;
      const wasStockTracked = order.Label
        ? variant?.Stock !== undefined
        : !item["Unlimited Stock"];
      if (wasStockTracked) {
        await base(SHOP_ITEMS_TABLE).update(itemId, {
          Stock: item.Stock + order.Quantity,
        });
        if (variant) {
          await base(SHOP_ITEM_VARIANTS_TABLE).update(variant._id, {
            Stock: (variant.Stock ?? 0) + order.Quantity,
          });
        }
      }
    }
  }
  await base(SHOP_ORDERS_TABLE).update(
    order._id,
    { Status: "Cancelled", Item: [] },
    { typecast: true }
  );
}

const STAMP_ADJUSTMENTS_TABLE = "Stamp Adjustments";

function toStampAdjustmentWithId(r: RawAirtableRecord): StampAdjustmentWithId {
  return { ...(r.fields as StampAdjustment), _id: r.id };
}

function byNewestAdjustment(a: StampAdjustmentWithId, b: StampAdjustmentWithId): number {
  return (b["Created At"] ?? "").localeCompare(a["Created At"] ?? "");
}

export async function getAdjustmentsByEmail(email: string): Promise<StampAdjustmentWithId[]> {
  const records = await base(STAMP_ADJUSTMENTS_TABLE)
    .select({ filterByFormula: `LOWER({Email}) = "${escapeFormula(email.toLowerCase())}"` })
    .all();
  return records
    .map((r) => toStampAdjustmentWithId(r as unknown as RawAirtableRecord))
    .sort(byNewestAdjustment);
}

const CONFIG_TABLE = "YSWS Config";

export async function getConfigValue(key: string): Promise<string | null> {
  const records = await base(CONFIG_TABLE)
    .select({ filterByFormula: `{Key} = "${escapeFormula(key)}"`, maxRecords: 1 })
    .firstPage();
  const value = records[0]?.fields?.Value;
  return typeof value === "string" && value.length > 0 ? value : null;
}

const LOGINS_TABLE = "Logins";

type LoginAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

function loginAddressFields(a: LoginAddress | undefined) {
  return a?.line1
    ? {
        "Address (Line 1)": a.line1,
        "Address (Line 2)": a.line2 ?? "",
        City: a.city ?? "",
        "State / Province": a.state ?? "",
        Country: a.country ?? "",
        "ZIP / Postal Code": a.zip ?? "",
      }
    : {};
}

export async function recordLogin(user: {
  email: string;
  name?: string;
  slackId?: string;
  address?: LoginAddress;
}): Promise<void> {
  const now = new Date().toISOString();
  const addressFields = loginAddressFields(user.address);
  const records = await base(LOGINS_TABLE)
    .select({ filterByFormula: `{Email} = "${escapeFormula(user.email)}"`, maxRecords: 1 })
    .firstPage();

  if (records[0]) {
    const count = (records[0].fields["Login Count"] as number) ?? 0;
    await base(LOGINS_TABLE).update(records[0].id, {
      Name: user.name,
      "Slack ID": user.slackId,
      ...addressFields,
      "Last Login At": now,
      "Last Active At": now,
      "Login Count": count + 1,
    });
  } else {
    await base(LOGINS_TABLE).create({
      Email: user.email,
      Name: user.name,
      "Slack ID": user.slackId,
      ...addressFields,
      "First Login At": now,
      "Last Login At": now,
      "Last Active At": now,
      "Login Count": 1,
    });
  }
}

export async function touchActivity(user: {
  email: string;
  name?: string;
  slackId?: string;
  address?: LoginAddress;
}): Promise<void> {
  const now = new Date().toISOString();
  const addressFields = loginAddressFields(user.address);
  const records = await base(LOGINS_TABLE)
    .select({ filterByFormula: `{Email} = "${escapeFormula(user.email)}"`, maxRecords: 1 })
    .firstPage();

  if (records[0]) {
    const hasAddress = Boolean(records[0].fields["Address (Line 1)"]);
    await base(LOGINS_TABLE).update(records[0].id, {
      ...(hasAddress ? {} : addressFields),
      "Last Active At": now,
    });
  } else {
    await base(LOGINS_TABLE).create({
      Email: user.email,
      Name: user.name,
      "Slack ID": user.slackId,
      ...addressFields,
      "First Login At": now,
      "Last Login At": now,
      "Last Active At": now,
      "Login Count": 1,
    });
  }
}

export async function getSubmissionWindow(): Promise<SubmissionWindow> {
  const [open, close] = await Promise.all([
    getConfigValue("Submissions Open"),
    getConfigValue("Submissions Close"),
  ]);
  return { open, close };
}

export const getSubmissionWindowCached = unstable_cache(
  getSubmissionWindow,
  ["submission-window"],
  { revalidate: 60 }
);

const FEEDBACK_TABLE = "Feedback";

export async function hasSubmittedFeedback(hcUserId: string): Promise<boolean> {
  const records = await base(FEEDBACK_TABLE)
    .select({
      filterByFormula: `{Hack Club ID} = "${escapeFormula(hcUserId)}"`,
      maxRecords: 1,
      fields: [],
    })
    .firstPage();
  return records.length > 0;
}

export async function createFeedback(fields: {
  hcUserId: string;
  email: string;
  name?: string;
  slackId?: string;
  recommend: number;
  didWell: string;
  improve: string;
  extraThoughts: string;
  canEmail: boolean;
  participation: string;
}): Promise<void> {
  await base(FEEDBACK_TABLE).create(
    {
      "Hack Club ID": fields.hcUserId,
      Email: fields.email,
      Name: fields.name ?? "",
      "Slack ID": fields.slackId ?? "",
      "Recommend (1-10)": fields.recommend,
      "What We Did Well": fields.didWell,
      "What We Can Improve": fields.improve,
      "Extra Thoughts": fields.extraThoughts,
      "Can Email": fields.canEmail,
      Participation: fields.participation,
      "Submitted At": new Date().toISOString(),
    },
    { typecast: true }
  );
}
