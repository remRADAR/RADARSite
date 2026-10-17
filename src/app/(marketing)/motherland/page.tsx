import { IaIndex } from "@/components/marketing/IaPages";
import { Marquee } from "@/components/motion/Marquee";
import Image from "next/image";
import { StructuredData } from "@/components/StructuredData";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForProject } from "@/lib/editorial-archives";
import { breadcrumbStructuredData, buildPageMetadata, webPageStructuredData } from "@/lib/seo";
import "./motherland-motion.css";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "MOTHERLand",
  description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
  path: "/motherland",
  image: "/motherland/featured.gif",
});

// MOTHERLand ticker — same surface treatment as the homepage hero ticker
// (.ticker-surface + Marquee). Placeholder copy: the page will get its real
// ticker direction later; for now a single word flows: MOTHERLAND.
const MOTHERLAND_TICKER_ITEMS = ["MOTHERLAND"];

export default async function MotherlandPage() {
  const { articles } = await readPublishedContent();
  const motherland = recordsForProject(articles);

  return (
    <>
      <StructuredData data={webPageStructuredData({ name: "MOTHERLand", description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.", path: "/motherland", type: "CollectionPage" })} />
      <StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "MOTHERLand", path: "/motherland" }])} />
      <section aria-label="MOTHERLand hero" className="relative h-[calc(100svh-3.5rem)] min-h-[20rem] w-full overflow-hidden border-y-2 border-ink bg-ink">
        <Image
          src="/motherland/featured.gif"
          alt="Aerial view of a dense tropical forest surrounding a turquoise lake"
          fill
          sizes="100vw"
          unoptimized
          priority
          className="motherland-hero-media absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        {/* Soft scrim keeps the ticker legible over bright GIF frames. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-t from-black/60 to-transparent" />
        {/* MOTHERLand ticker — inherits its colors from .ticker-surface in
            globals.css, exactly like the homepage hero ticker. */}
        <div className="ticker-surface absolute inset-x-0 bottom-0 z-10 border-t border-white/55">
          <Marquee durationSeconds={26} className="py-3" repeat={10}>
            {MOTHERLAND_TICKER_ITEMS.map((item) => (
              <span data-ticker-text key={item} className="mx-3 whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest md:mx-6">
                {item}
              </span>
            ))}
          </Marquee>
        </div>
      </section>
      <IaIndex
        eyebrow="(MOTHERLand / Music To Her)"
        title="MOTHERLand"
        intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
        items={motherland}
        basePath="/ontheradar/articles"
        indexClassName="motherland-index"
      />
    </>
  );
}
