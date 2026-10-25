"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { SubmissionCard } from "./SubmissionCard";
import { DraftCard } from "./DraftCard";
import { OrdersModal } from "./OrdersModal";
import { NewProjectModal } from "./NewProjectModal";
import { computeBalance, stampsEarned, tagClaimableSubmission } from "@/lib/rewards";
import { isIdVerified } from "@/lib/identity";
import type { AirtableRecordWithId, ShopOrderWithId, StampAdjustmentWithId } from "@/lib/types";

interface User {
  id: string;
  email: string;
  name: string;
  slackId?: string;
  birthday?: string;
  verificationStatus?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

interface Props {
  user: User;
  submissions: AirtableRecordWithId[];
  orders: ShopOrderWithId[];
  adjustments: StampAdjustmentWithId[];
  itemImages: Record<string, string>;
  submissionsOpen: boolean;
}

export function SubmissionsGrid({ user, submissions, orders, adjustments, itemImages, submissionsOpen }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<AirtableRecordWithId | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(searchParams.get("orders") === "1");

  const balance = computeBalance(submissions, orders, adjustments);
  const idVerified = isIdVerified(user.verificationStatus);
  const drafts = submissions.filter((s) => s.Status === "Draft");
  const realSubmissions = submissions.filter((s) => s.Status !== "Draft");
  const tagClaimableId = tagClaimableSubmission(submissions)?._id;

  function openNew() {
    if (!submissionsOpen) return;
    setActiveDraft(null);
    setModalOpen(true);
  }

  function openDraft(draft: AirtableRecordWithId) {
    if (!submissionsOpen) return;
    setActiveDraft(draft);
    setModalOpen(true);
  }

  function refresh() {
    setModalOpen(false);
    router.refresh();
  }

  function refreshOrders() {
    router.refresh();
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="flex items-start justify-between gap-4 mb-12 flex-wrap">
        <div>
          <EyebrowLabel className="mb-3 block">your projects</EyebrowLabel>
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.96 }}
          >
            {balance} stamps
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setOrdersOpen(true)}>
            my orders →
          </Button>
          <ButtonLink href="/shop" variant="ink">
            go to shop →
          </ButtonLink>
          <Button variant="primary" onClick={openNew} disabled={!submissionsOpen}>
            new project →
          </Button>
        </div>
      </div>

      {!submissionsOpen && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30 mb-8">
          Submissions are closed right now. Drafts are also frozen (view-only).
        </p>
      )}

      {!idVerified && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30 mb-8">
          You're signed in, but your Hack Club account isn't ID verified yet. You'll need to verify at{" "}
          <a href="https://identity.hackclub.com" target="_blank" rel="noopener noreferrer" className="underline">
            identity.hackclub.com
          </a>{" "}
          (then sign out and back in here) before you can ship a submission. You can still start and save drafts.
        </p>
      )}

      {realSubmissions.length === 0 && drafts.length === 0 ? (
        <p className="text-smoke text-sm py-8">
          {submissionsOpen ? 'No projects yet. Hit "new project" to start one.' : "No projects yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {drafts.map((d) => (
            <DraftCard
              key={d._id}
              draft={d}
              onContinue={openDraft}
              onDiscarded={refresh}
              submissionsOpen={submissionsOpen}
            />
          ))}
          {realSubmissions.map((s) => (
            <SubmissionCard
              key={s._id}
              submission={s}
              stamps={stampsEarned(s, submissions)}
              canClaimTag={s._id === tagClaimableId}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <NewProjectModal
          user={user}
          draft={activeDraft}
          onClose={() => setModalOpen(false)}
          onSaved={refresh}
          submissionsOpen={submissionsOpen}
        />
      )}

      {ordersOpen && (
        <OrdersModal
          orders={orders}
          submissions={realSubmissions}
          itemImages={itemImages}
          onClose={() => setOrdersOpen(false)}
          onChanged={refreshOrders}
        />
      )}
    </div>
  );
}
