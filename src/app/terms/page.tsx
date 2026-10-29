import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Terms of Use", description: "The terms that govern your use of RADARCharts by REM at radarcharts.net and its linked services.", path: "/terms" });

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-paper px-4 pb-24 pt-28 text-ink md:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="font-mono text-xs font-bold uppercase tracking-widest">← remRADAR</Link>
          <p className="mt-20 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(Legal / Terms)</p>
          <h1 className="mt-4 display text-[clamp(3rem,9vw,8rem)]">Terms<br /><span className="text-flare">of use.</span></h1>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">Last updated: 15 October 2026</p>

          <div className="mt-16 space-y-10 font-mono text-sm leading-relaxed">
            <section>
              <h2 className="display text-2xl">1. Agreement</h2>
              <p className="mt-3">These Terms of Use govern your access to and use of radarcharts.net, operated by RADARCharts by REM (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;remRADAR&rdquo;), including our editorial pages, charts, artist features, and media. By using the site you agree to these terms and to our Privacy Policy. If you do not agree, please do not use the site.</p>
            </section>

            <section>
              <h2 className="display text-2xl">2. Acceptable use</h2>
              <p className="mt-3">You may use the site for lawful, personal, non-commercial purposes. You agree not to: interfere with or attempt to gain unauthorised access to the site, its administrative areas, or its infrastructure; scrape, data-mine, or harvest content at a scale that degrades the service; submit false, misleading, or infringing material; impersonate any person or entity; use the site to distribute spam, malware, or unlawful content; or circumvent any security or access controls.</p>
              <p className="mt-3">We may suspend or block access for conduct that violates these terms or threatens the site or its users.</p>
            </section>

            <section>
              <h2 className="display text-2xl">3. Ownership of content</h2>
              <p className="mt-3">The site name, logo, brand identity, editorial text, artwork, photography, video, audio, charts, and other visual assets are owned by RADARCharts by REM, our contributors, or their respective rights holders. Third-party media (including stock imagery and embedded 3D scenes) may be used under licence from its owners.</p>
              <p className="mt-3">Music, recordings, and artist materials featured on the site remain the property of their owners — artists, labels, distributors, and rightsholders — and are presented for discovery and editorial purposes.</p>
            </section>

            <section>
              <h2 className="display text-2xl">4. Permitted use of content</h2>
              <p className="mt-3">You may view, share links to, and reasonably quote our editorial content with attribution to RADARCharts by REM. You may not reproduce, republish, resell, or create derivative works from site content without our prior written permission, except where permitted by applicable law (such as fair use or fair dealing) or where content is expressly licensed.</p>
            </section>

            <section>
              <h2 className="display text-2xl">5. Submissions and artist features</h2>
              <p className="mt-3">If you submit material for consideration — including artist information, releases, press assets, or story tips — you confirm you have the right to submit it and grant us a worldwide, non-exclusive, royalty-free licence to host, display, and publish it on the site and in connection with our editorial work. You keep ownership of your material. We may decline, edit for length or clarity, or remove submissions at our discretion.</p>
            </section>

            <section>
              <h2 className="display text-2xl">6. Editorial independence and accuracy</h2>
              <p className="mt-3">Our charts, rankings, features, and opinions reflect our editorial judgment. Chart positions and cataloguing information are compiled in good faith from available sources, but we cannot guarantee completeness or accuracy. We may correct, update, or remove content at any time without notice.</p>
            </section>

            <section>
              <h2 className="display text-2xl">7. Third-party content and services</h2>
              <p className="mt-3">The site may contain links to or embed content from third parties, including RADARMe, streaming and social platforms, and external media. We do not control and are not responsible for third-party content, availability, or practices. Follow links and use linked services at your own risk and under their own terms.</p>
            </section>

            <section>
              <h2 className="display text-2xl">8. Availability</h2>
              <p className="mt-3">We aim to keep the site accurate and available, but we provide it &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. Content, features, and availability may change, be suspended, or be discontinued without notice, including during maintenance, upgrades, or migration.</p>
            </section>

            <section>
              <h2 className="display text-2xl">9. Disclaimers</h2>
              <p className="mt-3">To the fullest extent permitted by law, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. Nothing on the site is professional, legal, financial, or medical advice. We do not warrant that the site will be uninterrupted, secure, or error-free.</p>
            </section>

            <section>
              <h2 className="display text-2xl">10. Limitation of liability</h2>
              <p className="mt-3">To the fullest extent permitted by law, RADARCharts by REM and its team will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill, arising from or connected to your use of the site. Where liability cannot be excluded, it is limited to the greatest extent permitted by law.</p>
            </section>

            <section>
              <h2 className="display text-2xl">11. Indemnity</h2>
              <p className="mt-3">You agree to indemnify and hold us harmless from claims, damages, and expenses (including reasonable legal costs) arising from your use of the site, your submissions, or your breach of these terms.</p>
            </section>

            <section>
              <h2 className="display text-2xl">12. Copyright complaints</h2>
              <p className="mt-3">If you believe content on the site infringes your copyright or other rights, contact us with a description of the work, the location on the site, and your contact details, and we will review and respond promptly. We respect rightsholders and will remove or disable access to material when a valid complaint is established.</p>
            </section>

            <section>
              <h2 className="display text-2xl">13. Governing law and disputes</h2>
              <p className="mt-3">These terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from them will be subject to the exclusive jurisdiction of the competent courts of Nigeria, unless mandatory consumer-protection law in your country of residence provides otherwise. We will always try to resolve concerns directly first — contact us before starting formal proceedings.</p>
            </section>

            <section>
              <h2 className="display text-2xl">14. Changes and contact</h2>
              <p className="mt-3">We may update these terms from time to time; the &ldquo;Last updated&rdquo; date above reflects the current version. Continued use of the site after changes means you accept the updated terms. Questions can be sent to <a href="mailto:legal@radarcharts.net" className="underline decoration-flare">legal@radarcharts.net</a>.</p>
            </section>

            <section className="brut-border p-5">
              <p><strong>Note.</strong> This document is provided for the RADARCharts by REM site and is not legal advice. Have counsel confirm the contact email, governing-law and jurisdiction provisions, and any jurisdiction-specific obligations before launch.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
