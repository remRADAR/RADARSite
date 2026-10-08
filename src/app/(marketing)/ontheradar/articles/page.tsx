import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForEditorialType } from "@/lib/editorial-archives";

export const revalidate = 3600;

export default async function ArticlesPage() {
  const { articles } = await readPublishedContent();
  const press = recordsForEditorialType(articles, "Press");
  const spotlights = recordsForEditorialType(articles, "Spotlight");
  return (
    <>
      <ArchiveStructuredData name="RADARArticles" description="Press and Spotlight editorial coverage from RADARCharts." path="/ontheradar/articles" breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "RADARArticles", path: "/ontheradar/articles" }]} />
      <div>
      <section className="border-b-2 border-ink px-4 pb-10 pt-24 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / RADARArticles)</p>
        <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">RADAR<br /><span className="text-flare">Articles.</span></h1>
        <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">Choose the editorial lane first: Press for ordinary RADAR editorial coverage, or Spotlight for artist-led profiles. Motherland is an independent project association, and Magazine remains separate.</p>
      </section>
      <section className="grid border-b-2 border-ink md:grid-cols-2">
        <Link href="/ontheradar/articles/press/page/1" className="group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:border-b-0 md:border-r-2 md:p-10">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{press.length} entries / 01</span>
          <h2 className="mt-20 display text-5xl">Press<span className="text-flare group-hover:text-ink">.</span></h2>
          <p className="mt-4 max-w-sm font-mono text-xs uppercase text-muted-foreground group-hover:text-ink">Announcements, releases, news, and ordinary RADAR editorial updates.</p>
        </Link>
        <Link href="/ontheradar/articles/spotlight/page/1" className="group p-6 transition-colors hover:bg-flare md:p-10">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{spotlights.length} entries / 02</span>
          <h2 className="mt-20 display text-5xl">Spotlight<span className="text-flare group-hover:text-ink">.</span></h2>
          <p className="mt-4 max-w-sm font-mono text-xs uppercase text-muted-foreground group-hover:text-ink">Artist-led profiles, including Spotlights that are also associated with Motherland.</p>
        </Link>
      </section>
      </div>
    </>
  );
}
