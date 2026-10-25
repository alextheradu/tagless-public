import { getSession } from "@/lib/auth";
import { hasSubmittedFeedback } from "@/lib/airtable";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feedback: Tagless" };

export default async function FeedbackPage() {
  let user = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }

  const alreadySubmitted = user
    ? await hasSubmittedFeedback(user.id).catch(() => false)
    : false;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <EyebrowLabel className="mb-4 block">feedback</EyebrowLabel>
      <h1
        className="font-display text-ink mb-12"
        style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96 }}
      >
        how'd we do?
      </h1>

      {!user ? (
        <Card className="max-w-[520px] mx-auto w-full text-center py-12">
          <p className="font-display text-2xl text-ink mb-6">sign in first.</p>
          <p className="text-ink-soft text-sm mb-8">
            We use your Hack Club account so everyone can only fill this out once.
          </p>
          <ButtonLink href="/api/auth/hackclub?returnTo=/form" variant="primary">
            Sign in with Hack Club
          </ButtonLink>
        </Card>
      ) : alreadySubmitted ? (
        <Card className="max-w-[520px] mx-auto w-full text-center py-12">
          <p className="font-display text-3xl text-mint mb-4">already in.</p>
          <p className="text-ink-soft">
            You've already filled out this form. Thanks for the feedback!
          </p>
        </Card>
      ) : (
        <FeedbackForm />
      )}
    </div>
  );
}
