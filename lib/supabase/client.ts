import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const REMEMBER_KEY = "freelas:remember";

/** Whether the next sign-in should outlive the browser tab. Defaults to yes. */
export function remembersSession(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Call before signing in: "keep me signed in" or "only this tab". */
export function setRememberSession(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {}
}

/**
 * Session storage for Supabase: localStorage when the user asked to be
 * remembered, sessionStorage (cleared when the tab closes) otherwise.
 * Reads check both, so a session survives whichever choice made it.
 */
const authStorage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      const [keep, drop] = remembersSession()
        ? [localStorage, sessionStorage]
        : [sessionStorage, localStorage];
      keep.setItem(key, value);
      drop.removeItem(key);
    } catch {}
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {}
  },
};

/**
 * Returns a Supabase client when env vars are set, otherwise null.
 * While null, the app runs on the local mock store (lib/store).
 */
let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey, { auth: { storage: authStorage } });
  return client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
