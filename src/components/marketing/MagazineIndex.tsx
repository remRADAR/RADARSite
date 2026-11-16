import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";

type MagazineEntry = CmsRecord & { slug: string };

/** Cover art for an issue: explicit featured image first, then the first inline image. */
function coverImage(record: CmsRecord) {
  const explicit =
    typeof record.imageUrl === "string" && record.imageUrl.trim()
      ? record.imageUrl
      : typeof record.featuredImage === "string" && record.featuredImage.trim()
        ? record.featuredImage
        : "";
  const richBody = typeof record.bodyHtml === "string" && record.bodyHtml ? record.bodyHtml : typeof record.body === "string" ? record.body : "";
  const inline = richBody.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
  const candidate = explicit || inline;
  if (!candidate) return undefined;
  const resolved = getEffectiveImageUrl(candidate).effectiveUrl;
  return resolved || undefined;
}

function issueDate(record: CmsRecord) {
  const stamp = String(record.publishedAt || record.date || "");
  const parsed = Date.parse(stamp);
  if (!Number.isFinite(parsed)) return "RADAR";
  return new Date(parsed).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function issueNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

function entryHref(entry: MagazineEntry) {
  const explicit = (entry as CmsRecord).path;
  if (typeof explicit === "string" && explicit.trim()) return explicit;
  return articlePath(normalizeEditorialRecord(entry));
}

/**
 * Magazine index.
 *
 * Reads as a magazine rather than a flat archive: a lead issue with its cover,
 * then issue covers grouped by the canonical magazine lanes. Every entry opens
 * the flipbook reading experience.
 */
export function MagazineIndex({
  lead,
  specialEpisodes,
  magazineEpisodes,
  legacy,
}: {
  lead?: MagazineEntry;
  specialEpisodes: MagazineEntry[];
  magazineEpisodes: MagazineEntry[];
  legacy: MagazineEntry[];
}) {
  const leadRecord = lead ? normalizeEditorialRecord(lead) : null;
  const leadCover = leadRecord ? coverImage(leadRecord as CmsRecord) : undefined;

  const renderGrid = (items: MagazineEntry[], offset: number) => (
    <div className="grid grid-cols-1 border-t-2 border-ink sm:grid-cols-2 lg:grid-cols-3">
      {items.map((entry, index) => {
        const record = normalizeEditorialRecord(entry);
        const image = coverImage(record as CmsRecord);
        const position = offset + index;
        return (
          <FadeIn
            key={entry.slug}
            className={
              "border-b-2 border-ink " +
              (index % 3 !== 2 ? "lg:border-r-2 lg:border-ink " : "") +
              (index % 2 === 0 ? "sm:border-r-2 sm:border-ink " : "")
            }
          >
            <Link
              href={entryHref(entry)}
              className="group/issue block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare"
            >
              <div className="relative">
                <MediaFrame
                  tone={position % 3 === 0 ? "flare" : position % 3 === 1 ? "cool" : "mono"}
                  aspect="aspect-[3/4]"
                  className="bg-transparent"
                  label={record.title}
                  imageUrl={image}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  reveal
                />
                <span className="absolute left-0 top-0 bg-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-paper">
                  Issue {issueNumber(position)}
                </span>
                <span className="absolute bottom-0 right-0 bg-flare px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-flare-foreground">
                  Flipbook
                </span>
              </div>
              <div className="border-t-2 border-ink p-5 md:p-6">
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {record.sectionLabel} / {issueDate(record)}
                  {record.author ? " / " + record.author : ""}
                </p>
                <h3 className="mt-3 display max-w-[18ch] text-[clamp(1.4rem,2.6vw,2.4rem)] leading-[.96]">{record.title}</h3>
                <p className="mt-3 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">
                  {record.excerpt || "Editorial excerpt pending."}
                </p>
                <span className="mt-5 inline-flex font-mono text-xs font-bold uppercase tracking-widest text-flare">Read the issue →</span>
              </div>
            </Link>
          </FadeIn>
        );
      })}
    </div>
  );

  return (
    <div>
      {/* Masthead */}
      <section className="border-b-2 border-ink px-4 pb-10 pt-24 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / Magazine)</p>
        <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">
          Magazine<span className="text-flare">.</span>
        </h1>
        <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
          Every issue is a flipbook: the cover opens the book, the story turns page by page, and the pictures stay on the page they belong to.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 font-mono text-xs font-bold uppercase tracking-widest">
          <Link className="text-flare hover:underline" href="#special-episodes">
            Special Episodes ({specialEpisodes.length})
          </Link>
          <Link className="text-flare hover:underline" href="#magazine-episodes">
            Magazine Episodes ({magazineEpisodes.length})
          </Link>
          {legacy.length ? (
            <Link className="text-flare hover:underline" href="#archive">
              Archive ({legacy.length})
            </Link>
          ) : null}
        </div>
      </section>

      {/* Lead issue */}
      {lead && leadRecord ? (
        <section className="border-b-2 border-ink">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-b-2 border-ink md:border-b-0 md:border-r-2">
              <MediaFrame
                tone="flare"
                aspect="aspect-[3/4] md:aspect-auto"
                className="h-full min-h-[52vh] bg-transparent md:min-h-[70vh]"
                label={leadRecord.title}
                imageUrl={leadCover}
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
            <div className="flex flex-col justify-between p-5 md:p-10">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                (Magazine / Current Issue)
              </p>
              <div className="mt-8">
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Issue 01 / {issueDate(leadRecord)} / {leadRecord.sectionLabel}
                </p>
                <h2 className="mt-4 display text-[clamp(2.2rem,6vw,5.5rem)] leading-[.88]">
                  {leadRecord.title}
                  <span className="text-flare">.</span>
                </h2>
                <p className="mt-6 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
                  {leadRecord.excerpt || "Editorial excerpt pending."}
                </p>
                <Link
                  href={entryHref(lead)}
                  className="mt-8 inline-flex border-2 border-ink px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  Open the flipbook →
                </Link>
              </div>
              <p className="mt-10 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Cover opens the book · arrow keys, swipe or the page edges turn it
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Special Episodes */}
      <section id="special-episodes">
        <div className="flex flex-wrap items-end justify-between gap-6 px-4 pb-8 pt-16 md:px-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(Magazine / Special Episode)</p>
            <h2 className="mt-3 display text-[clamp(2rem,6vw,5rem)] leading-[.9]">
              Special Episodes<span className="text-flare">.</span>
            </h2>
          </div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
            Long-form special guest episodes from the canonical Magazine taxonomy.
          </p>
        </div>
        {specialEpisodes.length ? (
          renderGrid(specialEpisodes, 0)
        ) : (
          <p className="border-t-2 border-ink px-4 py-10 font-mono text-xs uppercase tracking-widest text-muted-foreground md:px-8">
            No Special Episodes published yet.
          </p>
        )}
      </section>

      {/* Magazine Episodes */}
      <section id="magazine-episodes">
        <div className="flex flex-wrap items-end justify-between gap-6 px-4 pb-8 pt-16 md:px-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(Magazine / Magazine Episode)</p>
            <h2 className="mt-3 display text-[clamp(2rem,6vw,5rem)] leading-[.9]">
              Magazine Episodes<span className="text-flare">.</span>
            </h2>
          </div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
            The regular Magazine Episode lane, separate from Press and Spotlight.
          </p>
        </div>
        {magazineEpisodes.length ? (
          renderGrid(magazineEpisodes, specialEpisodes.length)
        ) : (
          <p className="border-t-2 border-ink px-4 py-10 font-mono text-xs uppercase tracking-widest text-muted-foreground md:px-8">
            No Magazine Episodes published yet.
          </p>
        )}
      </section>

      {/* Legacy standalone magazine content */}
      {legacy.length ? (
        <section id="archive">
          <div className="flex flex-wrap items-end justify-between gap-6 px-4 pb-8 pt-16 md:px-8">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(Magazine / Archive)</p>
              <h2 className="mt-3 display text-[clamp(2rem,6vw,5rem)] leading-[.9]">
                Archive<span className="text-flare">.</span>
              </h2>
            </div>
            <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
              Legacy standalone Magazine content remains discoverable here while its subtype metadata is reviewed.
            </p>
          </div>
          {renderGrid(legacy, specialEpisodes.length + magazineEpisodes.length)}
        </section>
      ) : null}
    </div>
  );
}
