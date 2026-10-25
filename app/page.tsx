import { Hero } from "@/components/landing/Hero";
import { TagMarquee } from "@/components/landing/TagMarquee";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Resources } from "@/components/landing/Resources";
import { FAQ } from "@/components/landing/FAQ";
import { getSubmissionWindowCached } from "@/lib/airtable";

export default async function HomePage() {
  const { close } = await getSubmissionWindowCached().catch(() => ({ close: null }));

  return (
    <div className="overflow-x-clip">
      <Hero close={close} />
      <TagMarquee />
      <HowItWorks />
      <Resources />
      <FAQ />
    </div>
  );
}
