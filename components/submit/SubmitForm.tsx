"use client";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { HackatimeConnect, type HackatimeProject } from "./HackatimeConnect";
import { ProjectMultiSelect, formatProjectHours } from "./ProjectMultiSelect";
import { isIdVerified } from "@/lib/identity";
import { joinHackatimeProjects, parseHackatimeProjects } from "@/lib/hackatimeProjects";
import { compressImage } from "./compressImage";

const oauthErrors: Record<string, string> = {
  no_code: "OAuth flow was interrupted. Please try signing in again.",
  invalid_state: "Security check failed. Please try signing in again.",
  auth_failed: "Sign-in failed. Try again or contact us on Slack if it keeps happening.",
};

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
  user: User | null;
  error?: string;
  hackatimeError?: string;
  draftId?: string;
  initialValues?: Partial<FormState>;
  initialProjectDescriptions?: Record<string, string>;
  onClose?: () => void;
  onSaved?: () => void;
  submissionsOpen?: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  githubUsername: string;
  codeUrl: string;
  playableUrl: string;
  hackatimeProject: string;
  description: string;
  howDidYouHear: string;
  whatAreWeDoingWell: string;
  howCanWeImprove: string;
  lapseHours: string;
  lapseJustification: string;
  birthday: string;
}

const DRAFT_FIELDS = [
  "firstName",
  "lastName",
  "githubUsername",
  "codeUrl",
  "playableUrl",
  "hackatimeProject",
  "description",
  "howDidYouHear",
  "whatAreWeDoingWell",
  "howCanWeImprove",
  "lapseHours",
] as const;

export interface SubmitFormHandle {
  requestClose: () => void;
}

export const SubmitForm = forwardRef<SubmitFormHandle, Props>(function SubmitForm({
  user,
  error,
  hackatimeError,
  draftId,
  initialValues,
  initialProjectDescriptions,
  onClose,
  onSaved,
  submissionsOpen = true,
}, ref) {
  const [projects, setProjects] = useState<HackatimeProject[]>([]);
  const [hackatimeConnected, setHackatimeConnected] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>({
    firstName: initialValues?.firstName ?? user?.name?.split(" ")[0] ?? "",
    lastName: initialValues?.lastName ?? user?.name?.split(" ").slice(1).join(" ") ?? "",
    email: user?.email ?? "",
    githubUsername: initialValues?.githubUsername ?? "",
    codeUrl: initialValues?.codeUrl ?? "",
    playableUrl: initialValues?.playableUrl ?? "",
    hackatimeProject: initialValues?.hackatimeProject ?? "",
    description: initialValues?.description ?? "",
    howDidYouHear: initialValues?.howDidYouHear ?? "",
    whatAreWeDoingWell: initialValues?.whatAreWeDoingWell ?? "",
    howCanWeImprove: initialValues?.howCanWeImprove ?? "",
    lapseHours: initialValues?.lapseHours ?? "",
    lapseJustification: initialValues?.lapseJustification ?? "",
    birthday: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "saving-draft">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [noAiPledge, setNoAiPledge] = useState(false);
  const [tutorialPledge, setTutorialPledge] = useState(false);
  const [rulesPledge, setRulesPledge] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [projectDescriptions, setProjectDescriptions] = useState<Record<string, string>>(
    initialProjectDescriptions ?? {}
  );
  const selectedProjects = parseHackatimeProjects(form.hackatimeProject);
  const needsProjectDescriptions = selectedProjects.length > 1;
  const missingProjectDescriptions =
    needsProjectDescriptions && selectedProjects.some((name) => !projectDescriptions[name]?.trim());

  function selectedProjectDescriptions(): Record<string, string> {
    return Object.fromEntries(selectedProjects.map((name) => [name, projectDescriptions[name] ?? ""]));
  }

  const handleProjects = useCallback((p: HackatimeProject[]) => {
    setProjects(p);
    setHackatimeConnected(true);
  }, []);

  useImperativeHandle(ref, () => ({
    requestClose() {
      if (!user || status === "success") {
        onClose?.();
        return;
      }
      saveDraft();
    },
  }));

  if (!user) {
    return (
      <div className="flex flex-col gap-4 max-w-[520px] mx-auto w-full">
        {error && (
          <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
            {oauthErrors[error] ?? "Sign-in failed. Please try again."}
          </p>
        )}
        <Card className="text-center py-12">
          <p className="font-display text-2xl text-ink mb-6">sign in first.</p>
          <p className="text-ink-soft text-sm mb-8">
            We use Hack Club OAuth to verify you're a real human.
          </p>
          <ButtonLink href="/api/auth/hackclub" variant="primary">
            sign in with hack club →
          </ButtonLink>
        </Card>
      </div>
    );
  }

  function field(name: keyof FormState) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submissionsOpen) {
      setErrorMsg("Submissions are closed right now.");
      setStatus("error");
      return;
    }
    if (!idVerified) {
      setErrorMsg("Your Hack Club account isn't ID verified yet. Verify at identity.hackclub.com, then sign out and back in here before shipping.");
      setStatus("error");
      return;
    }
    if (!screenshot) {
      setErrorMsg("Screenshot is required.");
      setStatus("error");
      return;
    }
    if (!noAiPledge) {
      setErrorMsg("Check the box confirming you didn't use AI to build this.");
      setStatus("error");
      return;
    }
    if (!tutorialPledge) {
      setErrorMsg("Check the tutorial box.");
      setStatus("error");
      return;
    }
    if (!rulesPledge) {
      setErrorMsg("Check the box confirming you've read and followed the rules.");
      setStatus("error");
      return;
    }
    if (parseFloat(form.lapseHours) > 0 && !form.lapseJustification.trim()) {
      setErrorMsg("Add links explaining your claimed lapse hours.");
      setStatus("error");
      return;
    }
    if (missingProjectDescriptions) {
      setErrorMsg("Describe what each Hackatime project is.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) {
      body.append(key, value);
    }
    body.append("noAiPledge", String(noAiPledge));
    body.append("tutorialPledge", String(tutorialPledge));
    body.append("rulesPledge", String(rulesPledge));
    body.append("projectDescriptions", JSON.stringify(selectedProjectDescriptions()));
    if (currentDraftId) body.append("draftId", currentDraftId);

    try {
      const upload = await compressImage(screenshot);
      if (upload.size > 4 * 1024 * 1024) {
        setErrorMsg("Screenshot is too large (max ~4 MB). Use a smaller image or a JPG/PNG.");
        setStatus("error");
        return;
      }
      body.append("screenshot", upload);

      const res = await fetch("/api/submit", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(75_000),
      });

      if (res.ok) {
        setStatus("success");
        onSaved?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          data.error ??
            (res.status === 413
              ? "Screenshot is too large. Use a smaller image."
              : "Something went wrong. Try again.")
        );
        setStatus("error");
      }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      setErrorMsg(
        timedOut
          ? "Submission timed out. It may have gone through — check your dashboard before retrying."
          : "Network error — couldn't reach the server. Check your connection and try again."
      );
      setStatus("error");
    }
  }

  async function saveDraft() {
    setStatus("saving-draft");
    setErrorMsg("");

    const payload = {
      ...Object.fromEntries(DRAFT_FIELDS.map((key) => [key, form[key]])),
      projectDescriptions: selectedProjectDescriptions(),
    };
    const res = await fetch(
      currentDraftId ? `/api/submit/draft/${currentDraftId}` : "/api/submit/draft",
      {
        method: currentDraftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const saved = await res.json();
      setCurrentDraftId(saved._id);
      setStatus("idle");
      onSaved?.();
      onClose?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Couldn't save draft. Try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Card className="max-w-[520px] mx-auto w-full text-center py-12">
        <p className="font-display text-3xl text-mint mb-4">shipped.</p>
        <p className="text-ink-soft mb-8">We'll review your submission within a week. Watch your email and Slack.</p>
        {onClose ? (
          <Button variant="ink" onClick={onClose}>
            back to dashboard →
          </Button>
        ) : (
          <ButtonLink href="/submit" variant="ink">
            view your dashboard →
          </ButtonLink>
        )}
      </Card>
    );
  }

  const inputClass = "w-full border-[1.5px] border-ink rounded-md px-4 py-3 font-body text-sm bg-paper placeholder:text-smoke transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-magenta focus:shadow-[0_0_0_4px_rgba(255,45,111,0.12)]";
  const slackId = user.slackId;
  const idVerified = isIdVerified(user.verificationStatus);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 max-w-[600px] mx-auto w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <EyebrowLabel>first name</EyebrowLabel>
          <input className={inputClass} required {...field("firstName")} />
        </div>
        <div className="flex flex-col gap-2">
          <EyebrowLabel>last name</EyebrowLabel>
          <input className={inputClass} required {...field("lastName")} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <EyebrowLabel>email</EyebrowLabel>
          <input type="email" className={inputClass} required {...field("email")} />
        </div>
        <div className="flex flex-col gap-2">
          <EyebrowLabel>slack id (autofilled)</EyebrowLabel>
          <div className={`${inputClass} text-ink-soft`}>
            {slackId ?? "Not available"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <EyebrowLabel>github username</EyebrowLabel>
          <input className={inputClass} placeholder="yourusername" required {...field("githubUsername")} />
        </div>
        <div className="flex flex-col gap-2">
          <EyebrowLabel>code url (github repo)</EyebrowLabel>
          <input type="url" className={inputClass} placeholder="https://github.com/you/project" required {...field("codeUrl")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>playable url</EyebrowLabel>
        <input type="url" className={inputClass} placeholder="https://..." required {...field("playableUrl")} />
      </div>

      <HackatimeConnect onProjects={handleProjects} hackatimeError={hackatimeError} />

      {hackatimeConnected && projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <EyebrowLabel>hackatime project(s)</EyebrowLabel>
          <p className="text-xs text-smoke">
            Tracked this across more than one project? Pick all of them — hours get added up.
          </p>
          <ProjectMultiSelect
            projects={projects}
            value={selectedProjects}
            onChange={(names) => setForm((f) => ({ ...f, hackatimeProject: joinHackatimeProjects(names) }))}
          />
        </div>
      )}

      {hackatimeConnected && needsProjectDescriptions && (
        <div className="flex flex-col gap-3">
          <EyebrowLabel>what is each project?</EyebrowLabel>
          <p className="text-xs text-smoke -mt-1">
            One line each, e.g. &ldquo;the backend API&rdquo; or &ldquo;early prototype before I renamed the repo&rdquo;. Reviewers see this.
          </p>
          {selectedProjects.map((name) => {
            const seconds = projects.find((p) => p.name === name)?.totalSeconds ?? 0;
            return (
              <label key={name} className="flex flex-col gap-1.5">
                <span className="flex justify-between gap-3 text-xs font-mono">
                  <span className="text-ink truncate">{name}</span>
                  <span className="text-ink-soft shrink-0">{formatProjectHours(seconds)}</span>
                </span>
                <input
                  className={inputClass}
                  required
                  maxLength={300}
                  placeholder={`What is ${name}?`}
                  value={projectDescriptions[name] ?? ""}
                  onChange={(e) =>
                    setProjectDescriptions((d) => ({ ...d, [name]: e.target.value }))
                  }
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <EyebrowLabel>what did you build? (2-3 sentences, min 10 characters)</EyebrowLabel>
        <textarea className={inputClass + " resize-none"} rows={3} required minLength={10} {...field("description")} />
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>screenshot of your project</EyebrowLabel>
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>how did you hear about this?</EyebrowLabel>
        <input className={inputClass} required {...field("howDidYouHear")} />
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>what are we doing well?</EyebrowLabel>
        <textarea className={inputClass + " resize-none"} rows={2} {...field("whatAreWeDoingWell")} />
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>how can we improve?</EyebrowLabel>
        <textarea className={inputClass + " resize-none"} rows={2} {...field("howCanWeImprove")} />
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>lapse hours (optional)</EyebrowLabel>
        <p className="text-xs text-smoke">
          Coding time Hackatime didn't track (e.g. you were offline). Claim it here — it
          counts toward your total, but you'll need to back it up.
        </p>
        <input
          type="number"
          step="any"
          min="0"
          className={inputClass}
          placeholder="0"
          {...field("lapseHours")}
        />
        {parseFloat(form.lapseHours) > 0 && (
          <textarea
            className={inputClass + " resize-none"}
            rows={2}
            required
            placeholder="Links proving this time (commits, screenshots, notes) — comma-separated"
            {...field("lapseJustification")}
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>shipping address (from hack club account)</EyebrowLabel>
        {user.address ? (
          <div className={`${inputClass} text-ink-soft leading-relaxed`}>
            {user.address.line1}
            {user.address.line2 ? <><br />{user.address.line2}</> : null}
            {user.address.city || user.address.state || user.address.zip ? <br /> : null}
            {[user.address.city, user.address.state, user.address.zip].filter(Boolean).join(", ")}
            {user.address.country ? <br /> : null}
            {user.address.country}
          </div>
        ) : (
          <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
            Your Hack Club account has no address on file. Add one at{" "}
            <a href="https://identity.hackclub.com" target="_blank" rel="noopener noreferrer" className="underline">
              identity.hackclub.com
            </a>{" "}
            then sign out and back in here.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <EyebrowLabel>birthday (from hack club account)</EyebrowLabel>
        {user.birthday ? (
          <div className={`${inputClass} text-ink-soft`}>{user.birthday}</div>
        ) : (
          <>
            <p className="text-xs text-smoke">
              Not on your Hack Club account. Enter it manually, or add one at{" "}
              <a href="https://identity.hackclub.com" target="_blank" rel="noopener noreferrer" className="underline">
                identity.hackclub.com
              </a>{" "}
              and sign back in.
            </p>
            <input type="date" className={inputClass} required {...field("birthday")} />
          </>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={noAiPledge}
          onChange={(e) => setNoAiPledge(e.target.checked)}
          required
          className="mt-1 w-4 h-4 shrink-0 accent-magenta"
        />
        <span>
          I didn't use AI to make this project, and I understand there are
          consequences if I did.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={tutorialPledge}
          onChange={(e) => setTutorialPledge(e.target.checked)}
          required
          className="mt-1 w-4 h-4 shrink-0 accent-magenta"
        />
        <span>
          If I followed a tutorial to build this, I added a significant
          amount on top of it, and I understand there are consequences if
          I didn't.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={rulesPledge}
          onChange={(e) => setRulesPledge(e.target.checked)}
          required
          className="mt-1 w-4 h-4 shrink-0 accent-magenta"
        />
        <span>
          I've read and followed the{" "}
          <a
            href="/docs/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            rules
          </a>
          .
        </span>
      </label>

      {status === "error" && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
          {errorMsg}
        </p>
      )}
      {!slackId && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
          Your Hack Club OAuth session did not include a Slack ID. Sign out and sign in again.
        </p>
      )}
      {!idVerified && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
          You need to be ID verified to ship a submission. Verify at{" "}
          <a href="https://identity.hackclub.com" target="_blank" rel="noopener noreferrer" className="underline">
            identity.hackclub.com
          </a>{" "}
          then sign out and back in here. You can still save this as a draft in the meantime.
        </p>
      )}
      {!submissionsOpen && (
        <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
          Submissions are closed right now. You can still save this as a draft, but shipping is paused.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!submissionsOpen || !slackId || !idVerified || !user.address || !(user.birthday || form.birthday) || !noAiPledge || !tutorialPledge || !rulesPledge || !hackatimeConnected || selectedProjects.length === 0 || missingProjectDescriptions || status === "submitting"}
        >
          {status === "submitting" ? "submitting..." : "ship it →"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={saveDraft}
          disabled={status === "submitting" || status === "saving-draft"}
        >
          {status === "saving-draft" ? "saving..." : "save draft"}
        </Button>
      </div>
    </form>
  );
});
