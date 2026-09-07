import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPublishedContent } from "@/lib/content-server";
import { MediaFrame } from "@/components/MediaFrame";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ cmsPath: string[] }> };

async function getPage(params: Props["params"]) {
  const { cmsPath } = await params;
  const path = `/${cmsPath.join("/")}`;
  const { pages } = await readPublishedContent();
  return pages.find((page) => page.path === path || page.slug === cmsPath.at(-1));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage(params);
  return page ? { title: page.metaTitle || page.title, description: page.metaDescription || page.body } : { title: "Page not found" };
}

export default async function CmsPage({ params }: Props) {
  const page = await getPage(params);
  if (!page) notFound();
  const taxonomy = [...(page.tags || []), ...(page.categories || [])].join(" / ");
  return <article className="pt-14"><div className="grid min-h-[60svh] grid-cols-1 md:grid-cols-2"><div className="flex flex-col justify-end border-b-2 border-ink p-5 md:border-b-0 md:border-r-2 md:p-10"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{taxonomy || "RADAR / PAGE"}</p><h1 className="mt-5 display text-[clamp(3rem,8vw,8rem)] leading-[.86]">{page.title}<span className="text-flare">.</span></h1></div><MediaFrame tone="flare" aspect="aspect-auto" className="min-h-[45vh] md:min-h-0" label={page.title} imageUrl={page.imageUrl || page.featuredImage} /></div><div className="bg-paper px-5 py-16 md:px-10 md:py-24"><div className="mx-auto max-w-4xl"><p className="whitespace-pre-wrap font-display text-[clamp(1.8rem,4vw,4rem)] font-extrabold uppercase leading-[.95]">{page.body || ""}</p></div></div></article>;
}
