"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Contractor, FreelancerCard, Job } from "../core/types";
import type { Action, State } from "./reducer";

export interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

/** Where the data lives: the device (demo) or Supabase. */
export type Backend = "demo" | "supabase";

/** Sign-in refused because the account's e-mail was never confirmed. */
export class EmailNotConfirmedError extends Error {}

export interface AuthApi {
  /** Creates the account. Without a session yet, the user must confirm the e-mail first. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  /** Confirms a new account with the code from the sign-up e-mail. */
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUp: (email: string) => Promise<void>;
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
  /** Fetches jobs and applications again. */
  reload: () => Promise<void>;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
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

  const notify = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    // Errors stay longer: they usually need reading.
    const ms = tone === "error" ? 6000 : 3600;
    timers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms));
  }, []);

  return { toasts, notify, timers };
}

// When the first splash appeared, so a remounted splash picks up where it was.
let splashStart: number | undefined;

/** Opening screen while the app loads. Animation lives in globals.css (.splash-*). */
export function Splash() {
  const [offset] = useState(() => {
    if (typeof window === "undefined") return 0;
    splashStart ??= performance.now();
    return performance.now() - splashStart;
  });
  return (
    <div
      role="status"
      aria-label="Carregando o Freelas"
      className="grid min-h-dvh place-items-center bg-navy"
      style={{ "--splash-t": `-${Math.round(offset)}ms` } as CSSProperties}
    >
      <div className="flex flex-col items-center gap-6">
        <p className="flex items-baseline font-display text-4xl font-extrabold tracking-tight text-white">
          <span className="splash-f">F</span>
          <span className="splash-rest">reelas</span>
          <span className="splash-dot text-cta">.</span>
        </p>
        <span className="splash-bar" aria-hidden />
      </div>
    </div>
  );
}
