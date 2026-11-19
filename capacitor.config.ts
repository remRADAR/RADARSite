import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "net.radarcharts.app",
  appName: "RADARCharts",
  webDir: "public",
  server: {
    // RADAR is a server-rendered Next.js app. Keep the native shell pointed at
    // the canonical deployed origin instead of pretending it is a static export.
    url: process.env.CAPACITOR_SERVER_URL || "https://radarcharts.net",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#050505",
  },
};

export default config;
