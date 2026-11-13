"use client";
import dynamic from "next/dynamic";
import { UsersRound } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Magnetic } from "@/components/motion/Magnetic";
import { useSiteConfig } from "@/lib/site-config-context";
import { COMMUNITY_CHANNEL_URL } from "@/types/site-config";
import styles from "./CTASection.module.css";

const MusicGlobe = dynamic(() => import("./MusicGlobe"), { ssr: false });

const globeLocations = [
  { name: "Lagos", lat: 6.52, lng: 3.38, value: 3300 },
  { name: "London", lat: 51.51, lng: -0.13, value: 7400 },
  { name: "New York", lat: 40.71, lng: -74.01, value: 8200 },
  { name: "Tokyo", lat: 35.68, lng: 139.69, value: 9100 },
  { name: "São Paulo", lat: -23.55, lng: -46.63, value: 5100 },
];

export function CTASection() {
  const { config } = useSiteConfig();
  const cta = { headline: config.homepage.ctaSection.headline.split(" ") };
  return (
    <section className={`on-dark relative isolate overflow-hidden text-paper ${styles.section}`} data-testid="cta-section">
      <div className={`relative z-10 flex items-center justify-between px-4 py-6 md:px-8 ${styles.header}`}>
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Start</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Put it on the RADAR</p>
      </div>
      <FadeIn className={`relative z-10 border-t-2 border-paper px-4 py-20 md:px-8 md:py-32 ${styles.content}`}>
        <h2 className={`display text-[clamp(3rem,11vw,12rem)] leading-[0.85] ${styles.headline}`}>
          {cta.headline.map((line, index) => (
            <span key={`${line}-${index}`} className="block">{index === cta.headline.length - 1 ? <span className="text-flare">{line}</span> : line}</span>
          ))}
        </h2>
        <div className={styles.globeStage} data-testid="cta-globe-stage">
          <MusicGlobe
            locations={globeLocations}
            globeScale={0.92}
            glow={0.7}
            dotDensity={0.62}
            colors={{ land: "#B8C7E6", glow: "#3D6BFF", accent: "#FFD08A", text: "#FFFFFF", card: "rgba(8, 10, 18, 0.72)" }}
            motion={{ autoRotate: true, speed: 6, interaction: 1, tilt: 15 }}
            particles={{ count: 500, size: 1 }}
            storms={{ enabled: true, intensity: 1, radius: 1, particleCount: 55, particleSize: 1, speed: 1, rings: 3, ringSpeed: 1, scaleByValue: true }}
            connections={{ mode: "hub", speed: 0.4 }}
            markers={{ size: 1, scaleByValue: true, labels: false }}
            readout={{ show: false, unit: "" }}
            player={{ enabled: false, autoplay: false, autoAdvance: false, volume: 0 }}
          />
        </div>
        <div className={styles.contact}>
          <Magnetic strength={0.5}>
            <a
              href={COMMUNITY_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join the RADAR community"
              className="inline-flex h-16 w-16 items-center justify-center brut-border border-paper bg-flare text-flare-foreground transition-transform hover:-translate-y-1"
            >
              <UsersRound aria-hidden size={28} strokeWidth={2.5} />
            </a>
          </Magnetic>
        </div>
      </FadeIn>
    </section>
  );
}
