"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBriefs } from "@/lib/briefs-context";
import { cn } from "@/lib/utils";

const PROJECT_TYPES = ["Packaging", "Film", "Campaign", "Print / Digital", "Product"];
const BUDGET_RANGES = ["Under $15k", "$15k–$30k", "$40k–$75k", "$75k–$150k", "$150k+"];
const TIMELINES = ["2–4 weeks", "4–8 weeks", "8–12 weeks", "12+ weeks"];
const STEPS = ["Project", "Budget & timeline", "Details"];

export function BriefForm() {
  const router = useRouter();
  const { addBrief } = useBriefs();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canAdvance = () => {
    if (step === 0) return title.trim().length > 0 && projectType.length > 0;
    if (step === 1) return budgetRange.length > 0 && timeline.length > 0;
    return true;
  };

  const next = () => {
    if (!canAdvance()) {
      setError("Please fill in all fields before continuing.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = () => {
    if (details.trim().length === 0) {
      setError("Add a short project description before submitting.");
      return;
    }
    addBrief({ title, projectType, budgetRange, timeline, details });
    router.push("/briefs");
  };

  return (
    <div className="max-w-xl brut-border bg-paper p-6 md:p-8">
      <ol className="flex flex-wrap items-center gap-3">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center font-mono text-xs font-bold",
                i <= step ? "bg-flare text-flare-foreground" : "border-2 border-ink bg-paper text-muted-foreground"
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "font-mono text-[11px] font-bold uppercase tracking-widest",
                i === step ? "text-ink" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-0.5 w-6 bg-ink" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col gap-6">
        {step === 0 && (
          <>
            <Field label="Project title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Holiday capsule packaging"
                className="h-12 border-2 border-ink font-mono"
              />
            </Field>
            <Field label="Project type">
              <Select value={projectType} onValueChange={(v) => setProjectType(v ?? "")}>
                <SelectTrigger className="h-12 w-full border-2 border-ink font-mono">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Budget range">
              <Select value={budgetRange} onValueChange={(v) => setBudgetRange(v ?? "")}>
                <SelectTrigger className="h-12 w-full border-2 border-ink font-mono">
                  <SelectValue placeholder="Select a range" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Timeline">
              <Select value={timeline} onValueChange={(v) => setTimeline(v ?? "")}>
                <SelectTrigger className="h-12 w-full border-2 border-ink font-mono">
                  <SelectValue placeholder="Select a timeline" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        {step === 2 && (
          <Field label="Project details">
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              placeholder="What are we making, and why now?"
              className="border-2 border-ink font-mono"
            />
          </Field>
        )}

        {error && (
          <p className="bg-flare px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-flare-foreground">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className="h-11 px-5 font-mono text-xs font-bold uppercase tracking-widest"
          >
            ← Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={next}
              className="h-11 brut-border bg-ink px-6 font-mono text-xs font-bold uppercase tracking-widest text-paper hover:bg-flare hover:text-flare-foreground"
            >
              Continue →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              className="h-11 brut-border bg-flare px-6 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground hover:bg-ink hover:text-paper"
            >
              Submit brief
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
