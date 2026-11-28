import brandsConfig from "../../public/assets/tickers/brands/ticker.json";
import partnersConfig from "../../public/assets/tickers/partners/ticker.json";
import projectsConfig from "../../public/assets/tickers/projects/ticker.json";

export type TickerSetId = "brands" | "partners" | "projects";

export type TickerLogo = {
  name: string;
  src: string;
  order: number;
  href?: string;
  monochrome?: boolean;
};

type TickerConfigEntry = Omit<TickerLogo, "monochrome"> & { monochrome?: boolean };
type TickerSet = { ariaLabel: string; logos: TickerLogo[] };

function ordered(entries: TickerConfigEntry[]): TickerLogo[] {
  return [...entries].sort((a, b) => a.order - b.order);
}

export const TICKER_SETS: Record<TickerSetId, TickerSet> = {
  brands: {
    ariaLabel: "remRADAR brands",
    logos: ordered(brandsConfig as TickerConfigEntry[]),
  },
  partners: {
    ariaLabel: "remRADAR partners",
    logos: ordered(partnersConfig as TickerConfigEntry[]),
  },
  projects: {
    ariaLabel: "remRADAR projects",
    logos: ordered(projectsConfig as TickerConfigEntry[]),
  },
};
