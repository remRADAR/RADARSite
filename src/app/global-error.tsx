"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050505", color: "#f7f7f2", fontFamily: "monospace" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <section style={{ maxWidth: "36rem", border: "2px solid currentColor", padding: "2rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>(Critical pause)</p>
            <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 6rem)", lineHeight: 0.9, margin: "1.5rem 0" }}>Signal interrupted.</h1>
            <p style={{ lineHeight: 1.6 }}>RADAR could not complete this request. Refresh the signal to try again.</p>
            <button type="button" onClick={() => reset()} style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", border: "2px solid currentColor", background: "transparent", color: "inherit", font: "inherit", fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}>Reload</button>
          </section>
        </main>
      </body>
    </html>
  );
}
