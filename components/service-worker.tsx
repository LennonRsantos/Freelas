"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // The Android app always loads the live site; a cache would serve stale screens.
    if (Capacitor.isNativePlatform()) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
