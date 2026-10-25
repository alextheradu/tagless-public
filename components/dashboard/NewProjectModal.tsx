"use client";
import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { SubmitForm, type SubmitFormHandle } from "@/components/submit/SubmitForm";
import type { AirtableRecordWithId } from "@/lib/types";
import { descriptionsFromBreakdown } from "@/lib/hackatimeProjects";

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
  draft: AirtableRecordWithId | null;
  onClose: () => void;
  onSaved: () => void;
  submissionsOpen: boolean;
}

export function NewProjectModal({ user, draft, onClose, onSaved, submissionsOpen }: Props) {
  const formRef = useRef<SubmitFormHandle>(null);
  const requestClose = () => (formRef.current ? formRef.current.requestClose() : onClose());

  return (
    <Modal onClose={requestClose}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <EyebrowLabel>{draft ? "continue your draft" : "new project"}</EyebrowLabel>
        <button
          onClick={requestClose}
          aria-label="Close"
          className="font-mono text-sm text-ink-soft hover:text-ink"
        >
          ✕ close
        </button>
      </div>
      <SubmitForm
        ref={formRef}
        user={user}
        draftId={draft?._id}
        initialValues={
          draft
            ? {
                firstName: draft["First Name"],
                lastName: draft["Last Name"],
                githubUsername: draft["GitHub Username"],
                codeUrl: draft["Code URL"],
                playableUrl: draft["Playable URL"],
                hackatimeProject: draft["Hackatime Project"],
                description: draft.Description,
                howDidYouHear: draft["How did you hear about this?"],
                whatAreWeDoingWell: draft["What are we doing well?"],
                howCanWeImprove: draft["How can we improve?"],
                lapseHours: draft["Lapse Hours"]?.toString(),
              }
            : undefined
        }
        initialProjectDescriptions={
          draft ? descriptionsFromBreakdown(draft["Hackatime Project Breakdown"]) : undefined
        }
        onClose={onClose}
        onSaved={onSaved}
        submissionsOpen={submissionsOpen}
      />
    </Modal>
  );
}
