import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Privacy Policy", description: "How RADARCharts by REM collects, uses, and protects information across radarcharts.net and its linked services.", path: "/privacy" });

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-paper px-4 pb-24 pt-28 text-ink md:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="font-mono text-xs font-bold uppercase tracking-widest">← remRADAR</Link>
          <p className="mt-20 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(Legal / Privacy)</p>
          <h1 className="mt-4 display text-[clamp(3rem,9vw,8rem)]">Privacy<br /><span className="text-flare">policy.</span></h1>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">Last updated: 15 October 2026</p>

          <div className="mt-16 space-y-10 font-mono text-sm leading-relaxed">
            <section>
              <h2 className="display text-2xl">1. Who we are</h2>
              <p className="mt-3">RADARCharts by REM (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;remRADAR&rdquo;) operates radarcharts.net, a platform for discovering Nigerian and African music, artists, releases, stories, and culture. This policy explains what information we collect through the site, why we collect it, how we use it, and the choices you have. It applies to the public site, editorial pages, and any linked services we operate. References to RADARMe or other third-party services are governed by those services&rsquo; own policies.</p>
            </section>

            <section>
              <h2 className="display text-2xl">2. Information we collect</h2>
              <p className="mt-3"><strong>Information you give us.</strong> If you contact us, submit an enquiry, apply for a feature, or interact with our editorial team, we receive the details you provide (for example your name, email address, artist or release information, and message content).</p>
              <p className="mt-3"><strong>Information collected automatically.</strong> Like most websites, our servers and service providers collect technical request data when you visit: your IP address (or a truncated version of it), browser type and version, device type, operating system, referring page, pages visited, and the date and time of your visit. Where analytics is enabled, this data is processed in aggregate to understand how the site is used.</p>
              <p className="mt-3"><strong>Local storage.</strong> The site may store small files on your device (cookies and similar technologies) to remember preferences and support features. You can control or delete these through your browser settings; some parts of the site may function differently without them.</p>
              <p className="mt-3">We do not knowingly collect sensitive personal information (such as health, religious, or financial data) through this site, and we do not ask for it.</p>
            </section>

            <section>
              <h2 className="display text-2xl">3. How we use information</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Operate, maintain, and secure the site and its infrastructure.</li>
                <li>Understand usage through analytics so we can improve content and performance.</li>
                <li>Detect, prevent, and troubleshoot errors or abuse (including error and performance monitoring).</li>
                <li>Respond to your enquiries and fulfil requests you submit.</li>
                <li>Publish and manage editorial content, media, and artist features.</li>
                <li>Meet legal, regulatory, and security obligations.</li>
              </ul>
              <p className="mt-3">We do not sell your personal information, and we do not use your information to train general-purpose artificial intelligence models.</p>
            </section>

            <section>
              <h2 className="display text-2xl">4. Services we rely on</h2>
              <p className="mt-3">We use carefully selected providers to run the site. Depending on configuration, these may include: hosting and delivery (Vercel), database services (Neon Postgres), media storage and delivery (Cloudflare R2 and Cloudflare&rsquo;s network), error monitoring (Sentry), analytics (Google Analytics, where enabled), imagery (Unsplash), interactive 3D scenes (Spline), and publishing integrations (Notion, server-side only). These providers process data on our behalf or under their own policies. Where Google Analytics is enabled, Google may process data (including, for users in the EEA/UK, data associated with consent) under its own terms. We encourage you to review the policies of these services.</p>
            </section>

            <section>
              <h2 className="display text-2xl">5. Where data is stored</h2>
              <p className="mt-3">Our providers may store and process data in data centres in Nigeria, the European Union, the United States, or other regions. Where data is transferred internationally, we rely on the safeguards our providers offer (such as standard contractual clauses and equivalent mechanisms) and on your consent where required.</p>
            </section>

            <section>
              <h2 className="display text-2xl">6. How long we keep it</h2>
              <p className="mt-3">We keep personal information only as long as needed for the purposes described in this policy: request data and analytics are typically kept in aggregate or deleted within a short, fixed period; correspondence and submissions are kept while your enquiry or engagement is active and for a reasonable period afterwards; server and error logs are retained for security and debugging within the provider&rsquo;s standard retention windows.</p>
            </section>

            <section>
              <h2 className="display text-2xl">7. Your rights and choices</h2>
              <p className="mt-3">You have the right to ask us to access, correct, or delete your personal information, to object to or restrict certain processing, and to withdraw consent where processing is based on it. In Nigeria these rights are protected under the Nigeria Data Protection Act 2023; visitors from the EEA, UK, and other jurisdictions have equivalent rights under applicable law. You may also opt out of analytics by blocking analytics scripts via your browser or a privacy extension, and control cookies through your browser settings.</p>
              <p className="mt-3">To exercise any right, contact us at <a href="mailto:privacy@radarcharts.net" className="underline decoration-flare">privacy@radarcharts.net</a>. We will respond within a reasonable period and may verify your identity before acting on your request.</p>
            </section>

            <section>
              <h2 className="display text-2xl">8. Children</h2>
              <p className="mt-3">The site is intended for a general audience and is not directed at children under 13 (or a higher minimum age where local law requires it). If we learn that we have collected personal information from a child, we will delete it.</p>
            </section>

            <section>
              <h2 className="display text-2xl">9. Security</h2>
              <p className="mt-3">We use reasonable technical and organisational measures to protect the site and the information we handle, including encrypted transport (HTTPS), restricted access to credentials and administrative tools, and monitoring for errors and abuse. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="display text-2xl">10. External links</h2>
              <p className="mt-3">The site may link to external services, including RADARMe and third-party platforms. Once you follow a link, you are subject to that service&rsquo;s own policy and terms, and we are not responsible for how they handle your information.</p>
            </section>

            <section>
              <h2 className="display text-2xl">11. Changes and contact</h2>
              <p className="mt-3">We may update this policy as the site evolves. Material changes will be reflected in the &ldquo;Last updated&rdquo; date above. Questions about this policy can be sent to <a href="mailto:privacy@radarcharts.net" className="underline decoration-flare">privacy@radarcharts.net</a>.</p>
            </section>

            <section className="brut-border p-5">
              <p><strong>Note.</strong> This policy is provided for the RADARCharts by REM site and is not legal advice. Have counsel confirm the contact email, jurisdiction-specific language, and any registration obligations before launch.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
