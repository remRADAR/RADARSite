import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { buildPageMetadata } from "@/lib/seo";

const event = {
  slug: "omaji-verse-2",
  title: "OMAJI VERSE 2.0",
  description: "The annual end of year clarion call by Abuja’s renowned artist, OMAJI.",
  location: "LIQUID CAFÉ / CITY PARK WUSE, ABUJA",
  date: "10TH DECEMBER",
  time: "6PM PROMPT",
  poster: "/events/omaji-verse-2-poster.png",
};

export function generateStaticParams() {
  return [{ slug: event.slug }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== event.slug) return { title: "Event" };
  return buildPageMetadata({ title: event.title, description: event.description, path: `/stayaktiv/events/${event.slug}`, image: event.poster });
}

export default async function StayAktivEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== event.slug) notFound();

  return (
    <>
      <ArchiveStructuredData
        name={event.title}
        description={event.description}
        path={`/stayaktiv/events/${event.slug}`}
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "stayAKTiV", path: "/stayaktiv" }, { name: event.title, path: `/stayaktiv/events/${event.slug}` }]}
      />
      <main className="min-h-screen bg-[#050505] px-4 pb-20 pt-24 text-[#f7f7f2] md:px-8 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <Link href="/stayaktiv" className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8e51f] underline underline-offset-4">← Back to stayAKTiV</Link>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(18rem,28rem)_1fr] lg:items-start lg:gap-20">
            <div className="relative aspect-[10/11] overflow-hidden border-2 border-[#a8e51f] shadow-[0_0_4rem_rgba(168,229,31,.14)]">
              <Image src={event.poster} alt={`${event.title} event poster`} fill sizes="(min-width: 1024px) 28rem, 100vw" className="object-cover" priority />
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#a8e51f]">stayAKTiV / Event brief</p>
              <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.5rem,10vw,9rem)] font-extrabold uppercase leading-[.78] tracking-[-.08em]">{event.title}<span className="text-[#a8e51f]">.</span></h1>
              <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-white/70">{event.description}</p>
              <dl className="mt-12 grid border-y border-white/30 py-5 sm:grid-cols-3">
                <div className="border-b border-white/20 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5"><dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">When</dt><dd className="mt-2 font-mono text-sm font-bold uppercase">{event.date}<br />{event.time}</dd></div>
                <div className="border-b border-white/20 py-4 sm:border-b-0 sm:border-r sm:px-5 sm:py-0"><dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">Where</dt><dd className="mt-2 font-mono text-sm font-bold uppercase leading-relaxed">{event.location}</dd></div>
                <div className="pt-4 sm:pl-5 sm:pt-0"><dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">Access</dt><dd className="mt-2 font-mono text-sm font-bold uppercase">Details to follow</dd></div>
              </dl>
            </div>
          </div>

          <section className="mt-20 grid gap-3 border-t-2 border-white/80 pt-5 md:grid-cols-4" aria-label="Event detail sections">
            {["Highlights", "History", "Gallery", "Co-signs"].map((label, index) => (
              <article key={label} className="min-h-48 border border-white/40 p-5 transition-colors hover:border-[#a8e51f] hover:bg-[#a8e51f]/[.06] md:min-h-64">
                <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#a8e51f]">0{index + 1}</p>
                <h2 className="mt-16 font-display text-3xl font-extrabold uppercase leading-none tracking-[-.06em]">{label}<span className="text-[#a8e51f]">.</span></h2>
                <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-wide text-white/50">Content slot ready for the event brief.</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
