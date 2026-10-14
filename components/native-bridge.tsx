"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

/**
 * Glue for the Android app (Capacitor). Does nothing in the browser.
 * Plugins load lazily so the website bundle stays the same size.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const subs: Promise<{ remove: () => Promise<void> }>[] = [];

    void (async () => {
      const [{ App }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
      ]);

      // Android back button walks the app's history; it only exits at the start.
      subs.push(
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.exitApp();
        }),
      );

      // E-mail links (password reset, sign-up confirmation) open inside the app.
      // Keeps the #access_token… hash that Supabase reads on load.
      subs.push(
        App.addListener("appUrlOpen", ({ url }) => {
          if (url.startsWith(window.location.origin)) window.location.href = url;
        }),
      );

      await SplashScreen.hide();
    })();

    return () => {
      for (const sub of subs) void sub.then((s) => s.remove());
    };
  }, []);
  return null;
}
