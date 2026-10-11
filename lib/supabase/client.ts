import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns a Supabase client when env vars are set, otherwise null.
 * While null, the app runs on the local mock store (lib/store).
 */
let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey);
  return client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
