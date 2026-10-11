"use client";

import { lazy, Suspense, useSyncExternalStore, type ReactNode } from "react";
import { FEATURES } from "../core/features";
import { isSupabaseConfigured } from "../supabase/client";
import { Splash } from "./context";
import { RemoteProvider } from "./remote-provider";

export { useFreelas } from "./context";

// Demo data is a separate chunk, downloaded only in demo mode.
const DemoProvider = lazy(() => import("./demo-provider"));

const noopSubscribe = () => () => {};

/**
 * State lives only on the client. The server renders a splash, then:
 * Supabase keys set: real data. NEXT_PUBLIC_DEMO=true: demo data.
 * Neither: a setup message, never made-up data by accident.
 */
export function FreelasProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!hydrated) return <Splash />;
  if (isSupabaseConfigured) return <RemoteProvider>{children}</RemoteProvider>;
  if (FEATURES.demo) {
    return (
      <Suspense fallback={<Splash />}>
        <DemoProvider>{children}</DemoProvider>
      </Suspense>
    );
  }
  return <SetupNeeded />;
}

function SetupNeeded() {
  return (
    <div className="grid min-h-dvh place-items-center bg-navy px-6 text-white">
      <div className="max-w-md">
        <p className="font-display text-2xl font-extrabold tracking-tight">
          freelas<span className="text-cta">.</span>
        </p>
        <h1 className="mt-6 text-2xl font-extrabold">O app ainda não está conectado</h1>
        <p className="mt-2 text-slate-300">
          Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no <code>.env.local</code> ou nas variáveis de
          ambiente da hospedagem e reinicie o app. Para ver a demonstração com dados de exemplo, use{" "}
          <code>NEXT_PUBLIC_DEMO=true</code>.
        </p>
      </div>
    </div>
  );
}
