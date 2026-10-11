// Shared by the server layout (inline script) and the client toggle.
// Not a "use client" module: the layout needs the script as a plain string.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "freelas:theme";
export const THEME_EVENT = "freelas:theme";
/** Saved before the app was renamed from "Freelass". */
export const LEGACY_THEME_STORAGE_KEY = "freelass:theme";

/**
 * Runs in <head> before first paint, so the page never flashes the wrong
 * theme. Uses the saved choice, or the system setting when there is none.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||localStorage.getItem("${LEGACY_THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;
