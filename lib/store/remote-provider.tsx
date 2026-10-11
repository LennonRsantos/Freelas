"use client";

import type { Session } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchSnapshot, runAction } from "../data/remote";
import { ME } from "../core/mock";
import type { Contractor, Job, ViewMode } from "../core/types";
import { getSupabase } from "../supabase/client";
import { Splash, StoreContext, useToasts, type Store } from "./context";
import { reducer, type Action, type State } from "./reducer";

const MODE_KEY = "freelas:mode";

type Internal = Action | { type: "__replace"; state: State };

function remoteReducer(state: State, action: Internal): State {
  return action.type === "__replace" ? action.state : reducer(state, action);
}

function savedMode(): ViewMode {
  try {
    return localStorage.getItem(MODE_KEY) === "contratante" ? "contratante" : "freelancer";
  } catch {
    return "freelancer";
  }
}

const EMPTY: State = { user: null, mode: "freelancer", jobs: [], applications: [] };

/**
 * Supabase-backed store. Screens use the same state and actions as the
 * demo: each action is applied on screen right away, sent to the
 * database, then the data is reloaded (also on Realtime changes).
 */
export function RemoteProvider({ children }: { children: ReactNode }) {
  const sb = getSupabase()!;
  const [today] = useState(() => new Date());
  const [state, dispatchLocal] = useReducer(remoteReducer, undefined, () => ({
    ...EMPTY,
    mode: savedMode(),
  }));
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Splash only until the first load; later reloads happen in the background.
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const { toasts, notify } = useToasts();
  const modeRef = useRef(state.mode);
  useEffect(() => {
    modeRef.current = state.mode;
  }, [state.mode]);

  // Session: restored on load and kept in sync with sign-in / sign-out.
  // Signing in from /entrar must not swap the page for the splash.
  const [sawSignedOut, setSawSignedOut] = useState(false);
  useEffect(() => {
    const apply = (s: Session | null) => {
      setSession(s);
      if (!s) setSawSignedOut(true);
    };
    sb.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = sb.auth.onAuthStateChange((_event, s) => apply(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const uid = session?.user.id;
  const email = session?.user.email ?? "";

  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await fetchSnapshot(sb, uid, email, today);
      dispatchLocal({ type: "__replace", state: { ...snap, mode: modeRef.current } });
    } catch (e) {
      notify(`Não foi possível carregar os dados: ${(e as Error).message}`);
    } finally {
      setFirstLoadDone(true);
    }
  }, [sb, uid, email, today, notify]);

  useEffect(() => {
    if (uid) void refresh();
  }, [uid, refresh]);

  // Realtime: new applicants, approvals and check-ins arrive without reloading.
  useEffect(() => {
    if (!uid) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    const channel = sb
      .channel(`freelas-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, later)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, later)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void sb.removeChannel(channel);
    };
  }, [sb, uid, refresh]);

  const dispatch = useCallback(
    (action: Action) => {
      dispatchLocal(action);
      if (action.type === "set_mode") {
        try {
          localStorage.setItem(MODE_KEY, action.mode);
        } catch {}
        return;
      }
      if (!uid) return;
      if (action.type === "sign_out") {
        dispatchLocal({ type: "__replace", state: { ...EMPTY, mode: state.mode } });
      }
      runAction(sb, uid, action)
        .then(() => (action.type === "sign_out" ? undefined : refresh()))
        .catch((e: Error) => {
          notify(e.message);
          void refresh();
        });
    },
    [sb, uid, refresh, notify, state.mode],
  );

  const auth = useMemo<Store["auth"]>(
    () => ({
      async sendCode(address) {
        const { error } = await sb.auth.signInWithOtp({
          email: address,
          options: { shouldCreateUser: true },
        });
        if (error) throw new Error(error.message);
      },
      async verifyCode(address, code) {
        const { error } = await sb.auth.verifyOtp({ email: address, token: code, type: "email" });
        if (error) throw new Error("Código inválido ou expirado. Peça um novo código.");
      },
    }),
    [sb],
  );

  const contractorOf = useCallback(
    (job: Job): Contractor => {
      const card = state.directory?.contractors.find((c) => c.id === job.contractorId);
      if (job.contractorId === ME) {
        return {
          id: ME,
          name: state.user?.contratante?.businessName ?? "Meu estabelecimento",
          logoUrl: state.user?.contratante?.logoUrl,
          rating: card?.rating ?? 0,
          ratingCount: card?.ratingCount ?? 0,
        };
      }
      return card ?? { id: job.contractorId, name: "Contratante", rating: 0, ratingCount: 0 };
    },
    [state.directory, state.user],
  );

  const freelancerOf = useCallback(
    (id: string) => state.directory?.freelancers.find((f) => f.id === id),
    [state.directory],
  );

  const publishJob = useCallback<Store["publishJob"]>(
    (job) => {
      const id = crypto.randomUUID();
      dispatch({ type: "publish_job", job, id, now: new Date().toISOString() });
      return id;
    },
    [dispatch],
  );

  // Signed out: nothing from a previous account stays on screen.
  const shown = useMemo<State>(() => (uid ? state : { ...EMPTY, mode: state.mode }), [uid, state]);

  const value = useMemo<Store>(
    () => ({
      state: shown,
      dispatch,
      today,
      backend: "supabase",
      auth,
      contractorOf,
      freelancerOf,
      publishJob,
      resetDemo: () => {},
      toasts,
      notify,
    }),
    [shown, dispatch, today, auth, contractorOf, freelancerOf, publishJob, toasts, notify],
  );

  if (session === undefined || (uid && !firstLoadDone && !sawSignedOut)) return <Splash />;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
