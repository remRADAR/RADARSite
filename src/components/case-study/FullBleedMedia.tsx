import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { MediaFrame, type MediaTone } from "@/components/MediaFrame";
import type { UnsplashPhoto } from "@/lib/unsplash";

type FullBleedMediaProps = {
  tone: MediaTone;
  aspect?: string;
  label?: string;
  photo?: UnsplashPhoto | null;
};

export function FullBleedMedia({ tone, aspect = "aspect-[16/9]", label, photo }: FullBleedMediaProps) {
  return (
    <FadeIn className="brut-border-t">
      <ParallaxImage className={aspect}>
        <MediaFrame
          tone={tone}
          aspect="aspect-auto"
          className="h-full w-full"
          label={label}
          grain
          photo={photo}
        />
      </ParallaxImage>
    </FadeIn>
  );
}
