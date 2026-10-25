import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getDocBySlug, getAllDocMeta, getAllDocSlugs } from "@/lib/docs";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Note } from "@/components/docs/Note";
import { Alert } from "@/components/docs/Alert";
import { remarkAlerts } from "@/lib/remarkAlerts";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSlug = slug ?? [];
  const doc = getDocBySlug(resolvedSlug);
  return { title: `${doc.meta.title} - Tagless Docs` };
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const resolvedSlug = slug ?? [];
  const doc = getDocBySlug(resolvedSlug);
  const allDocs = getAllDocMeta();

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
      <DocsSidebar docs={allDocs} currentSlug={resolvedSlug.join("/")} />
      <article className="flex-1 min-w-0 max-w-[680px] prose-docs">
        <MDXRemote
          source={doc.content}
          components={{ Note, Alert }}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm, remarkAlerts] } }}
        />
      </article>
    </div>
  );
}
