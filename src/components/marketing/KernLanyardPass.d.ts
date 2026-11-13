import type { CSSProperties, ComponentType } from "react";

type FontSettings = {
  fontSize?: string | number;
  fontWeight?: string | number;
  fontStyle?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
  fontFamily?: string;
};

type KernLanyardPassProps = {
  content?: Record<string, string>;
  look?: {
    paper?: string;
    ink?: string;
    accent?: string;
    strapColor?: string;
    strapStyle?: "flat" | "cord";
    photo?: string | { src?: string; url?: string };
    photoFit?: "cover" | "inset";
    finish?: "gloss" | "matte" | "linen";
    foil?: boolean | "off" | "edges" | "marks" | "marks+edges";
    sleeve?: boolean;
    sleeveTexture?: "clear" | "frosted" | "textured";
    nameFont?: FontSettings;
    metaFont?: FontSettings;
    numberFont?: FontSettings;
  };
  light?: { angle?: number; height?: number; intensity?: number; rim?: boolean };
  layout?: { size?: number; padding?: number; stackGap?: number; thickness?: number };
  motion?: boolean;
  style?: CSSProperties;
};

declare const KernLanyardPass: ComponentType<KernLanyardPassProps>;
export default KernLanyardPass;
