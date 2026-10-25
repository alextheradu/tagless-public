import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface DocMeta {
  slug: string[];
  title: string;
  order: number;
  href: string;
  category: string;
}

export interface DocPage {
  meta: DocMeta;
  content: string;
}

function slugToFilePath(slug: string[]): string {
  if (slug.length === 0) {
    return path.join(CONTENT_DIR, "docs", "index.mdx");
  }

  const directPath = path.join(CONTENT_DIR, `${slug.join("/")}.mdx`);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  if (slug.length === 1) {
    const docsPath = path.join(CONTENT_DIR, "docs", `${slug[0]}.mdx`);
    if (fs.existsSync(docsPath)) return docsPath;
    return path.join(CONTENT_DIR, slug[0], "index.mdx");
  }

  return directPath;
}

function fileToRouteSlug(subdir: string, file: string): string[] {
  const name = file.replace(/\.mdx$/, "");

  if (subdir === "docs" && name === "index") {
    return [];
  }

  if (subdir === "docs") {
    return [name];
  }

  if (name === "index") {
    return [subdir];
  }

  return [subdir, name];
}

export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];
  const subdirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const subdir of subdirs) {
    const files = fs
      .readdirSync(path.join(CONTENT_DIR, subdir))
      .filter((f) => f.endsWith(".mdx"));
    for (const file of files) {
      slugs.push(fileToRouteSlug(subdir, file));
    }
  }
  return slugs;
}

export function getDocBySlug(slug: string[]): DocPage {
  const filePath = slugToFilePath(slug);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: data.title ?? slug[slug.length - 1] ?? "docs",
      order: data.order ?? 99,
      href: slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`,
      category: slug[0] ?? "docs",
    },
    content,
  };
}

export function getAllDocMeta(): DocMeta[] {
  return getAllDocSlugs()
    .map((slug) => getDocBySlug(slug).meta)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
