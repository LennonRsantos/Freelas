"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Contractor, FreelancerCard, Job } from "../core/types";
import type { Action, State } from "./reducer";

export interface Toast {
  id: number;
  message: string;
}

/** Where the data lives: the device (demo) or Supabase. */
export type Backend = "demo" | "supabase";

export interface AuthApi {
  /** Emails a 6-digit sign-in code. */
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Emails a link to /entrar/nova-senha. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for the signed-in user. */
  updatePassword: (password: string) => Promise<void>;
}

export interface Store {
  state: State;
  dispatch: (action: Action) => void;
  today: Date;
  backend: Backend;
  /** Present only with Supabase. */
  auth?: AuthApi;
  contractorOf: (job: Job) => Contractor;
  freelancerOf: (id: string) => FreelancerCard | undefined;
  /** Publishes a job and returns its id right away. */
  publishJob: (job: Extract<Action, { type: "publish_job" }>["job"]) => string;
  resetDemo: () => void;
  toasts: Toast[];
  notify: (message: string) => void;
}

export const StoreContext = createContext<Store | null>(null);

export function useFreelas(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useFreelas must be used inside <FreelasProvider>");
  return ctx;
}

/** Short-lived messages, shared by both providers. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    timers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600));
  }, []);

  return { toasts, notify, timers };
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-navy">
      <p className="font-display text-2xl font-extrabold tracking-tight text-white">
        freelas
        <span className="text-cta">.</span>
      </p>
    </div>
  );
}
