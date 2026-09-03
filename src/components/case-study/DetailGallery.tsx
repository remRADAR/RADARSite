import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import { DragCarousel } from "@/components/motion/DragCarousel";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";

// Fixed-height filmstrip: every item is the same height and fills via
// object-cover, only the width varies by span — a tidy, editorial gallery.
const WIDTH_CLASS: Record<GalleryItem["span"], string> = {
  full: "w-[88vw] md:w-[52rem]",
  half: "w-[74vw] md:w-[34rem]",
  third: "w-[60vw] md:w-[22rem]",
};

export function DetailGallery({
  items,
  photos = [],
}: {
  items: GalleryItem[];
  photos?: (UnsplashPhoto | null)[];
}) {
  return (
    <section className="brut-border-t bg-paper py-14 md:py-20">
      <div className="flex items-center justify-between px-4 pb-8 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(03) Detail</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-flare">
          ← Drag / scroll to explore →
        </p>
      </div>
      <FadeIn>
        <DragCarousel className="px-4 md:px-8" trackClassName="gap-4">
          {items.map((item, i) => (
            <div
              key={`${item.caption}-${i}`}
              className={cn("group/card h-[52vh] shrink-0 brut-border md:h-[62vh]", WIDTH_CLASS[item.span])}
            >
              <MediaFrame
                tone={item.tone}
                aspect="aspect-auto"
                className="h-full w-full"
                label={item.caption}
                photo={photos[i]}
                reveal
                attribution={false}
              />
            </div>
          ))}
        </DragCarousel>
      </FadeIn>
    </section>
  );
}
