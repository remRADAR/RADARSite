"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 dot-grid">
      <div className="w-full max-w-md brut-border brut-shadow bg-paper p-8 md:p-10">
        <Link href="/" className="group/logo flex items-center gap-3">
          <LogoMark />
          <span className="display text-xl">Northlight</span>
        </Link>
        <h1 className="mt-10 display text-[clamp(2.5rem,7vw,4rem)] leading-none">
          Client
          <br />
          Sign In<span className="text-flare">.</span>
        </h1>
        <p className="mt-4 font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">
          Design preview — enter any email to continue. No account is created.
        </p>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/dashboard");
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="font-mono text-[11px] font-bold uppercase tracking-widest">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 border-2 border-ink font-mono"
            />
          </div>
          <Button
            type="submit"
            className="mt-2 h-12 brut-border bg-flare font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground hover:bg-ink hover:text-paper"
          >
            Continue →
          </Button>
        </form>

        <Link
          href="/"
          className="mt-8 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-flare"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
