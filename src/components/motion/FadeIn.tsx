"use client";

import { ReactNode } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
};

export function FadeIn({ children, className, delay, as = "div" }: FadeInProps) {
  const ref = useScrollReveal<HTMLDivElement>({ y: 16, delay });
  const Tag = as as "div";
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
