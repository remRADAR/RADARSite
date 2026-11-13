import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { FounderLanyard } from "@/components/marketing/FounderLanyard";

// Brand purpose and the five-part artist-support model are adapted from REM's
// published legacy site: https://remradar.webflow.io/.
const remApproach = [
  {
    number: "01",
    title: "Talent discovery & intake",
    description:
      "Find emerging artists and understand their sound, story, and market positioning.",
  },
  {
    number: "02",
    title: "Brand identity & positioning",
    description:
      "Shape an artist identity across sound, image, and narrative for the audiences it seeks to reach.",
  },
  {
    number: "03",
    title: "Content & distribution",
    description:
      "Activate releases through platform distribution, media coverage, and audience targeting.",
  },
  {
    number: "04",
    title: "Amplification & community",
    description:
      "Grow visibility and build loyal communities around artists and their work.",
  },
  {
    number: "05",
    title: "Monetization & scaling",
    description:
      "Develop revenue streams, partnerships, and long-term growth.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "The REM Origin — RADARCharts by REM",
  description:
    "Explore the purpose, artist-first approach, and ecosystem behind RADARCharts by REM.",
  path: "/remradar",
});

export default function RemRadarPage() {
  return (
    <article className="overflow-hidden pt-14">
      <header className="border-b-2 border-ink px-4 pb-12 pt-16 md:px-8 md:pb-16 md:pt-24">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          (01 / The REM story)
        </p>
        <h1 className="mt-5 max-w-6xl display text-[clamp(5rem,25vw,22rem)] leading-[0.72] tracking-[-0.085em]">
          REM<span className="text-flare">.</span>
        </h1>
        <div className="mt-8 grid gap-6 border-t-2 border-ink pt-4 md:grid-cols-[0.72fr_1.28fr] md:items-end">
          <p className="display text-[clamp(1.6rem,4vw,3.6rem)] leading-[0.9]">
            PROTECTING THE MUSIC AS remRADAR.
          </p>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:justify-self-end md:text-lg">
            RADARCharts by REM empowers emerging artists with the visibility, tools, and
            infrastructure they need to break through—connecting talent to audiences, amplifying
            their stories, and driving sustainable growth in the global music landscape.
          </p>
        </div>
        <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          RADARCharts by REM <span aria-hidden="true">/</span> Artist-first music ecosystem
        </p>
      </header>

      <section
        aria-labelledby="founder-highlight"
        className="grid border-b-2 border-ink lg:grid-cols-[0.78fr_1.22fr]"
      >
        <div className="flex flex-col justify-between border-b-2 border-ink p-6 md:p-10 lg:border-b-0 lg:border-r-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              (02 / Founder highlight)
            </p>
            <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.14em] text-flare">
              CZA OF REM
            </p>
            <h2
              id="founder-highlight"
              className="mt-3 max-w-xl display text-[clamp(2.5rem,6vw,6rem)] leading-[0.88] tracking-[-0.045em]"
            >
              Tarzaa Gerald Caesar
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Founder of REM; known as CZA OF REM.
            </p>
          </div>
          <p className="mt-12 max-w-sm border-t border-ink/40 pt-4 font-mono text-[11px] uppercase leading-relaxed tracking-wider text-muted-foreground">
            The pass moves with a natural hanging swing. Drag it with a pointer or touch; focus it
            and use the arrow keys for keyboard movement. Reduced-motion settings are respected.
          </p>
        </div>
        <div className="min-w-0 p-4 md:p-8">
          <FounderLanyard />
        </div>
      </section>

      <section aria-labelledby="rem-approach" className="px-4 py-16 md:px-8 md:py-24">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (03 / The REM approach)
          </p>
          <div>
            <h2
              id="rem-approach"
              className="max-w-4xl display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.86] tracking-[-0.05em]"
            >
              FROM FIRST SIGNAL TO LASTING SUPPORT.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              REM describes its work as a connected path for emerging artists—from discovery and
              identity through distribution, community, and sustainable growth.
            </p>
            <ol className="mt-10 grid border-t-2 border-ink sm:grid-cols-2 lg:grid-cols-3">
              {remApproach.map((step) => (
                <li
                  key={step.number}
                  className="min-w-0 border-b-2 border-ink py-5 pr-5 sm:even:pl-6 lg:nth-[3n+2]:border-l-2 lg:nth-[3n+2]:pl-6 lg:nth-[3n]:border-l-2 lg:nth-[3n]:pl-6"
                >
                  <p className="font-mono text-[11px] font-bold tracking-widest text-flare">
                    {step.number} <span aria-hidden="true">/</span> REM
                  </p>
                  <h3 className="mt-4 display text-2xl leading-[0.95] tracking-[-0.035em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="radarcharts-ecosystem"
        className="border-t-2 border-ink bg-secondary px-4 py-12 md:px-8 md:py-16"
      >
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (04 / The ecosystem)
          </p>
          <div>
            <h2
              id="radarcharts-ecosystem"
              className="display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.85] tracking-[-0.05em]"
            >
              RADARCharts <span className="text-flare">by REM.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              A music ecosystem for artists, releases, stories, projects, and the people moving
              culture forward.
            </p>
            <nav
              aria-label="Explore RADARCharts"
              className="mt-10 grid border-t border-ink/40 sm:grid-cols-2"
            >
              <Link
                href="/about/ecosystem"
                className="group border-b border-ink/40 py-5 pr-5 font-mono text-xs font-bold uppercase tracking-widest hover:text-flare sm:border-r sm:pr-8"
              >
                Explore the ecosystem{" "}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
              <Link
                href="/radarmusic"
                className="group border-b border-ink/40 py-5 font-mono text-xs font-bold uppercase tracking-widest hover:text-flare sm:pl-8"
              >
                RADARMusic{" "}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
              <Link
                href="/ontheradar"
                className="group py-5 pr-5 font-mono text-xs font-bold uppercase tracking-widest hover:text-flare sm:border-r sm:border-ink/40 sm:pr-8"
              >
                On The RADAR{" "}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
              <Link
                href="/about"
                className="group py-5 font-mono text-xs font-bold uppercase tracking-widest hover:text-flare sm:pl-8"
              >
                About RADARCharts{" "}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </article>
  );
}
