"use client";

import KernLanyardPass from "./KernLanyardPass";
import styles from "./FounderLanyard.module.css";

type FounderLanyardProps = {
  onActivate?: () => void;
};

const portrait = { src: "/images/founder/tarzaa-gerald-caesar.webp" };

export function FounderLanyard({ onActivate }: FounderLanyardProps) {
  return (
    <div className={styles.stage}>
      <div className={styles.pass}>
        <KernLanyardPass
          content={{
            attendeeName: "Tarzaa Gerald Caesar",
            ticketType: "CZA OF REM",
            ticketNumber: "FOUNDER / REM",
            eventName: "REM",
            eventDate: "RADARCharts by REM",
            barcodeValue: "REMFOUNDER",
            backText: "REM",
            strapText: "REM / RADARCharts",
          }}
          look={{
            paper: "#131417",
            ink: "#f2f1ec",
            accent: "#c9ff33",
            strapColor: "#111214",
            strapStyle: "flat",
            photo: portrait,
            photoFit: "inset",
            finish: "matte",
            foil: "off",
            sleeve: true,
            sleeveTexture: "clear",
            nameFont: {
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: "1em",
            },
            metaFont: {
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              lineHeight: "1.15em",
            },
            numberFont: {
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: "1em",
            },
          }}
          light={{ angle: 25, height: 55, intensity: 0.9, rim: true }}
          layout={{ size: 320, padding: 38, stackGap: 10, thickness: 3 }}
          motion
          onClick={onActivate}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <span className="sr-only" id="founder-portrait-description">
        Founder pass for Tarzaa Gerald Caesar, CZA OF REM. Activate the pass to open the founder highlight.
      </span>
    </div>
  );
}
