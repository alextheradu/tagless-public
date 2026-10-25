import { getGalleryProjects } from "@/lib/airtable";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gallery: Tagless" };

export default async function GalleryPage() {
  let projects: Awaited<ReturnType<typeof getGalleryProjects>> = [];
  let failed = false;
  try {
    projects = await getGalleryProjects();
  } catch (err) {
    console.error("[gallery] Failed to load projects:", err);
    failed = true;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="mb-10">
        <EyebrowLabel className="mb-3 block">the gallery</EyebrowLabel>
        <h1
          className="font-display text-ink"
          style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.96 }}
        >
          {projects.length > 0 ? `${projects.length} tagless projects.` : "gallery."}
        </h1>
      </div>

      {failed ? (
        <p className="text-ink-soft">couldn&apos;t load projects right now, try again in a minute.</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-ink-soft">no approved projects yet. be the first.</p>
          <ButtonLink href="/submit" variant="primary">ship it →</ButtonLink>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <GalleryCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
