import type { Metadata } from "next";
import Link from "next/link";
import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent, type CmsRecord } from "@/lib/content-server";
import { normalizeEditorialRecord, type CanonicalSection } from "@/lib/editorial-normalization";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";

export const revalidate = 3600;

const PRIMARY_SECTIONS: { section: CanonicalSection; title: string; href: string; intro: string }[] = [
  { section: "radar-articles", title: "Press", href: "/ontheradar/articles/category/radararticles/page/1", intro: "News, updates, announcements, and quick features from the RADARCharts desk." },
  { section: "discovery-spot", title: "Spotlights", href: "/ontheradar/discovery", intro: "Artist profiles and discovery stories putting the next signal in focus." },
];

const OTHER_SECTIONS: { section: CanonicalSection; title: string; href: string }[] = [
  { section: "talk-to-us", title: "TALK TO US", href: "/ontheradar/talk-to-us" },
  { section: "motherland-radar", title: "MOTHERLand RADAR", href: "/ontheradar/motherland" },
  { section: "magazine", title: "Magazine", href: "/ontheradar/magazine" },
  { section: "charts", title: "Charts", href: "/ontheradar/charts" },
  { section: "editorials", title: "Editorials", href: "/ontheradar/editorials" },
  { section: "curated", title: "Curated", href: "/ontheradar/curated" },
  { section: "legacies", title: "Legacies", href: "/ontheradar/legacies" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readPublicSiteOverrides();
  const title = "RADARArticles";
  const description = "Press, spotlights, and focused editorial sections from RADARCharts.";
  const image = safeSocialImageUrl(settings.socialImage);
  return { title, description, alternates: { canonical: "/ontheradar/articles" }, openGraph: { type: "website", url: `${publicSiteUrl()}/ontheradar/articles`, siteName: settings.siteName, title, description, images: [{ url: image, width: 1200, height: 630, alt: title }] }, twitter: { card: "summary_large_image", site: settings.xHandle, title, description, images: [image] } };
}

function sectionOf(article: CmsRecord) {
  return normalizeEditorialRecord(article).section;
}

export default async function ArticlesPage() {
  const { articles } = await readPublishedContent();
  const classified = articles.map((article) => ({ article: article as CmsRecord, section: sectionOf(article as CmsRecord) }));
  const countFor = (section: CanonicalSection) => classified.filter((item) => item.section === section).length;
  const primaryItems = PRIMARY_SECTIONS.map((entry) => ({ ...entry, items: classified.filter((item) => item.section === entry.section).map((item) => item.article).slice(0, 6) }));
  const otherSections = OTHER_SECTIONS.map((entry) => ({ ...entry, count: countFor(entry.section) })).filter((entry) => entry.count > 0);

  return (
    <div className="pt-14">
      <section className="border-b-2 border-ink px-4 pb-12 pt-16 md:px-8 md:pt-24">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / RADARArticles)</p>
        <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">RADAR<span className="text-flare">Articles.</span></h1>
        <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
          Start with Press and Spotlights. Long-form conversations, MOTHERLand stories, charts, and other editorial signals continue on their dedicated pages.
        </p>
      </section>

      {primaryItems.map((entry) => (
        <section key={entry.section} aria-labelledby={`${entry.section}-heading`} className="border-b-2 border-ink">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink px-4 py-5 md:px-8">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{entry.section === "radar-articles" ? "01" : "02"} / Featured section</p>
              <h2 id={`${entry.section}-heading`} className="mt-2 display text-4xl md:text-6xl">{entry.title}<span className="text-flare">.</span></h2>
            </div>
            <Link href={entry.href} className="font-mono text-xs font-bold uppercase tracking-widest text-flare hover:text-ink">View all {entry.title} →</Link>
          </div>
          {entry.items.length ? <IaIndex eyebrow={`(RADARArticles / ${entry.title})`} title={entry.title} intro={entry.intro} items={entry.items} basePath="/ontheradar/articles" /> : <p className="px-4 py-12 font-mono text-xs uppercase tracking-widest text-muted-foreground md:px-8">No published entries yet.</p>}
        </section>
      ))}

      {otherSections.length ? <section aria-labelledby="other-sections" className="border-b-2 border-ink">
        <div className="border-b-2 border-ink px-4 py-5 md:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">03 / Continue exploring</p>
          <h2 id="other-sections" className="mt-2 display text-4xl md:text-6xl">Other sections<span className="text-flare">.</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {otherSections.map((entry, index) => <Link key={entry.section} href={entry.href} className={`group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:p-10 ${index % 2 === 0 ? "md:border-r-2" : ""}`}><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-ink">{String(index + 1).padStart(2, "0")} / {entry.count} entries</p><h3 className="mt-14 display text-3xl md:text-5xl">{entry.title}<span className="text-flare group-hover:text-ink">.</span></h3><p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-ink">Open section →</p></Link>)}
        </div>
      </section> : null}
    </div>
  );
}
