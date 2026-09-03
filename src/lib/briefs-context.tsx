"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Brief, initialBriefs } from "@/data/briefs";

type NewBriefInput = {
  title: string;
  projectType: string;
  budgetRange: string;
  timeline: string;
  details: string;
};

type BriefsContextValue = {
  briefs: Brief[];
  addBrief: (input: NewBriefInput) => void;
};

const BriefsContext = createContext<BriefsContextValue | null>(null);

export function useBriefs() {
  const ctx = useContext(BriefsContext);
  if (!ctx) throw new Error("useBriefs must be used within BriefsProvider");
  return ctx;
}

export function BriefsProvider({ children }: { children: React.ReactNode }) {
  const [briefs, setBriefs] = useState<Brief[]>(initialBriefs);

  const value = useMemo<BriefsContextValue>(
    () => ({
      briefs,
      addBrief: (input) => {
        const brief: Brief = {
          id: `brf-${Math.floor(1000 + Math.random() * 9000)}`,
          status: "Submitted",
          submittedAt: new Date().toISOString().slice(0, 10),
          ...input,
        };
        setBriefs((prev) => [brief, ...prev]);
      },
    }),
    [briefs]
  );

  return <BriefsContext.Provider value={value}>{children}</BriefsContext.Provider>;
}
