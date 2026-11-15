import Script from "next/script";

export function MetricoolTracker() {
  return (
    <Script id="metricool-tracker" strategy="afterInteractive">
      {`function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"39622274964f4345ed8d1170781db2b0"})});`}
    </Script>
  );
}
