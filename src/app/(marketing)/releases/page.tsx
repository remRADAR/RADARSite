import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { listReleaseLinks, type ReleaseLink } from "@/lib/release-links";
import { buildPageMetadata } from "@/lib/seo";

const description = "Official release and streaming links created by RADARMusic for releases distributed through the RADARMusic network.";

export const metadata: Metadata = buildPageMetadata({
  title: "RADARMusic Releases",
  description,
  path: "/releases",
});

export const revalidate = 300;

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "RELEASE DATE TBA"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date).toUpperCase();
}

function actionLabel(release: ReleaseLink) {
  return release.platformLinks?.some((platform) => platform.kind === "presave") ? "PRE-SAVE / OPEN LINKS" : "STREAM / OPEN LINKS";
}

function ReleaseCard({ release, featured = false }: { release: ReleaseLink; featured?: boolean }) {
  return (
    <Link href={`/${release.slug}`} className={`group grid overflow-hidden border-2 border-ink bg-paper transition-colors hover:bg-flare ${featured ? "md:grid-cols-[1.1fr_.9fr]" : "sm:grid-cols-[minmax(8rem,.75fr)_1.25fr]"}`}>
      <div className={`relative overflow-hidden bg-ink ${featured ? "aspect-[1.15] md:aspect-auto md:min-h-[25rem]" : "aspect-square sm:aspect-[1.15]"}`}>
        <Image src={release.coverImage} alt={`${release.title} by ${release.artist} cover artwork`} fill sizes={featured ? "(max-width: 768px) 100vw, 55vw" : "(max-width: 640px) 100vw, 35vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized />
        {featured && <span className="absolute left-4 top-4 bg-flare px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-flare-foreground">Featured release</span>}
      </div>
      <div className={`flex flex-col justify-between p-5 sm:p-7 ${featured ? "md:p-10" : ""}`}>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{dateLabel(release.releaseDate)} / {release.platformLinks?.length ?? 0} link{release.platformLinks?.length === 1 ? "" : "s"}</p>
          <h2 className={`mt-5 display leading-[.88] ${featured ? "text-[clamp(3rem,8vw,7rem)]" : "text-[clamp(2rem,4vw,4rem)]"}`}>{release.title}<span className="text-flare group-hover:text-ink">.</span></h2>
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-ink">{release.artist}</p>
        </div>
        <span className="mt-12 inline-flex w-fit border border-ink px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest group-hover:bg-ink group-hover:text-paper">{actionLabel(release)} <span aria-hidden="true" className="ml-3">↗</span></span>
      </div>
    </Link>
  );
}

export default async function ReleasesArchivePage() {
  const releases = (await listReleaseLinks())
    .filter((release) => release.status === "published")
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const featured = releases.find((release) => release.slug === "omolops") ?? releases[0];
  const remaining = releases.filter((release) => release.id !== featured?.id);

  return (
    <>
      <ArchiveStructuredData name="RADARMusic Releases" description={description} path="/releases" breadcrumbs={[{ name: "Home", path: "/" }, { name: "RADARMusic", path: "/radarmusic" }, { name: "Releases", path: "/releases" }]} />
      <main>
        <section className="border-b-2 border-ink px-4 pb-10 pt-24 md:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(THE RADARMusic / OFFICIAL LINKS)</p>
          <h1 className="mt-4 display text-[clamp(2.6rem,6.5vw,7rem)] leading-[.88]">RELEASE<br /><span className="text-flare">ARCHIVE.</span></h1>
          <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">A home for the official pre-save and streaming links created for RADARMusic-distributed releases. Each release opens its own verified link panel.</p>
        </section>
        {featured ? (
          <section className="border-b-2 border-ink p-4 md:p-8" aria-label="Featured release">
            <ReleaseCard release={featured} featured />
          </section>
        ) : (
          <section className="border-b-2 border-ink px-4 py-16 font-mono text-sm uppercase tracking-wide text-muted-foreground md:px-8">No published release links yet. New links will appear here when they are published.</section>
        )}
        {remaining.length > 0 && <section className="border-b-2 border-ink p-4 md:p-8" aria-labelledby="all-releases-heading">
          <div className="mb-6 flex items-end justify-between gap-4"><h2 id="all-releases-heading" className="display text-4xl md:text-6xl">All releases<span className="text-flare">.</span></h2><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{remaining.length} more</span></div>
          <div className="grid gap-4 md:grid-cols-2">{remaining.map((release) => <ReleaseCard key={release.id} release={release} />)}</div>
        </section>}
      </main>
    </>
  );
}
