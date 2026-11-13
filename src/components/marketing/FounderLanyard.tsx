"use client";

import KernLanyardPass from "./KernLanyardPass";
import styles from "./FounderLanyard.module.css";

const portrait = { src: "/images/founder/tarzaa-gerald-caesar.webp" };

export function FounderLanyard() {
  return (
    <div className={styles.stage}>
      <p className={styles.stageLabel} id="founder-pass-instructions">
        Interactive founder pass <span aria-hidden="true">/</span> drag to swing
      </p>
      <div className={styles.pass}>
        <KernLanyardPass
          content={{
            attendeeName: "Tarzaa Gerald Caesar",
            ticketType: "THE iNDUSTRY MESSiAH",
            ticketNumber: "FOUNDER / REM",
            eventName: "CZA OF REM",
            eventDate: "RADARCharts by REM",
            barcodeValue: "",
            backText: "CZA OF REM",
            strapText: "RADARCharts by REM",
          }}
          look={{
            paper: "#131417",
            ink: "#f2f1ec",
            accent: "#8796b2",
            strapColor: "#111214",
            strapStyle: "flat",
            photo: portrait,
            photoFit: "inset",
            finish: "matte",
            foil: "off",
            sleeve: true,
            sleeveTexture: "clear",
            numberFont: {
              fontSize: "32px",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: "1em",
            },
          }}
          light={{ angle: 25, height: 55, intensity: 0.9, rim: true }}
          layout={{ size: 320, padding: 38, stackGap: 14, thickness: 3 }}
          motion
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <p className={styles.keyboardHelp} id="founder-lanyard-keyboard-help">
        Drag with a pointer or touch. Focus the pass and use the arrow keys to move it.
      </p>
      <span className="sr-only" id="founder-portrait-description">
        Original founder portrait of Tarzaa Gerald Caesar, CZA OF REM.
      </span>
    </div>
  );
}
