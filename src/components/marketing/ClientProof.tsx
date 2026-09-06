import { FadeIn } from "@/components/motion/FadeIn";
import { DragCarousel } from "@/components/motion/DragCarousel";
import { homepageContent } from "@/lib/radar-content";

export function ClientProof() {
  const { proof } = homepageContent;
  return <section className="bg-paper"><div className="flex items-center justify-between px-4 py-6 md:px-8"><p className="font-mono text-xs font-bold uppercase tracking-widest">(04) Proof</p><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">In the ecosystem</p></div><div className="brut-border-t brut-border-b px-4 py-16 md:px-8 md:py-24"><FadeIn><blockquote className="max-w-5xl display text-[clamp(1.75rem,4.5vw,4rem)] leading-[0.98]">&ldquo;{proof.quote}&rdquo;</blockquote><p className="mt-8 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{proof.attribution}</p></FadeIn></div><FadeIn><DragCarousel className="px-4 py-8 md:px-8">{[...proof.partners, ...proof.partners].map((partner, i) => <span key={`${partner}-${i}`} className="flex h-20 shrink-0 select-none items-center brut-border bg-paper px-10 font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:bg-ink hover:text-paper">{partner}</span>)}</DragCarousel></FadeIn></section>;
}
