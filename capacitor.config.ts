import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android app: a native shell around the live site. Screen changes ship
 * with each Vercel deploy; only changes here or to plugins need a new APK.
 */
const config: CapacitorConfig = {
  appId: "br.app.freelas",
  appName: "Freelas",
  // Local page shown when the site can't load (no internet).
  webDir: "android-shell",
  server: {
    url: "https://freelasbr.vercel.app",
    cleartext: false,
    errorPath: "index.html",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Hidden by NativeBridge once the site loads; this cap keeps it from sticking offline.
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: "#1E293B",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#1E293B",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;
