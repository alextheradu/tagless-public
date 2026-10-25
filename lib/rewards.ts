import type {
  AirtableRecordWithId,
  ShopOrderWithId,
  ShopItemWithId,
  ShopItemVariant,
  StampAdjustmentWithId,
} from "./types";
import { sumHours } from "./submissionHours";
import { isProjectUpdate } from "./projectUpdates";

export const STAMPS_PER_DOLLAR = 10;
export const STAMPS_PER_HOUR = 50;

function roundUpStamps(stamps: number): number {
  const nearestInteger = Math.round(stamps);
  const floatingPointTolerance = Number.EPSILON * Math.max(1, Math.abs(stamps)) * 16;

  if (Math.abs(stamps - nearestInteger) <= floatingPointTolerance) {
    return nearestInteger;
  }

  return Math.ceil(stamps);
}

export const MIN_HOURS_FOR_TAG = 4;

export function itemPriceInStamps(item: ShopItemWithId, variant?: ShopItemVariant): number {
  const price = variant?.Price ?? item.Price;
  return roundUpStamps(price * STAMPS_PER_DOLLAR);
}

export function effectiveHours(submission: AirtableRecordWithId): number {
  return (
    submission["Optional - Override Hours Spent"] ??
    sumHours(submission["Normal Coding Hours"], submission["Lapse Hours"] ?? 0)
  );
}

function earliestApprovedProject(submissions: AirtableRecordWithId[]): AirtableRecordWithId | undefined {
  return submissions
    .filter((s) => s.Status === "Approved" && !isProjectUpdate(s))
    .sort((a, b) => a._createdTime.localeCompare(b._createdTime))[0];
}

export function tagClaimableSubmission(submissions: AirtableRecordWithId[]): AirtableRecordWithId | null {
  if (submissions.some((s) => s["Tag Claimed"])) return null;
  return earliestApprovedProject(submissions) ?? null;
}

function paysForTag(submission: AirtableRecordWithId, submissions: AirtableRecordWithId[]): boolean {
  if (isProjectUpdate(submission)) return false;
  if (submission["Tag Claimed"]) return true;
  return tagClaimableSubmission(submissions)?._id === submission._id;
}

export function stampsEarned(
  submission: AirtableRecordWithId,
  submissions: AirtableRecordWithId[] = [submission]
): number {
  if (submission.Status !== "Approved") return 0;
  const tagHours = paysForTag(submission, submissions) ? MIN_HOURS_FOR_TAG : 0;
  const eligibleHours = Math.max(0, effectiveHours(submission) - tagHours);
  return roundUpStamps(eligibleHours * STAMPS_PER_HOUR);
}

export interface StampBreakdown {
  earned: number;
  spent: number;
  adjusted: number;
  balance: number;
}

export function stampBreakdown(
  submissions: AirtableRecordWithId[],
  orders: ShopOrderWithId[],
  adjustments: StampAdjustmentWithId[] = []
): StampBreakdown {
  const earned = submissions.reduce((sum, s) => sum + stampsEarned(s, submissions), 0);
  const spent = orders
    .filter((o) => o.Status !== "Cancelled")
    .reduce((sum, o) => sum + roundUpStamps(o["Total Stamps Spent"]), 0);
  const adjusted = adjustments.reduce((sum, a) => sum + Math.round(a.Amount ?? 0), 0);
  return { earned, spent, adjusted, balance: earned - spent + adjusted };
}

export function computeBalance(
  submissions: AirtableRecordWithId[],
  orders: ShopOrderWithId[],
  adjustments: StampAdjustmentWithId[] = []
): number {
  return stampBreakdown(submissions, orders, adjustments).balance;
}
