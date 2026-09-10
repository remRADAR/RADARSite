"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export function MarketingChrome() {
  const pathname = usePathname();
  return pathname === "/" ? <SiteHeader /> : null;
}
