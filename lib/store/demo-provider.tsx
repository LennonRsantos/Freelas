"use client";

// Demo store: made-up data saved in the browser. Loaded only in demo mode,
// so none of this code or data reaches users of the real app.

import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { averageStars, mergeRating, toISODate } from "../core/logic";
import { CONTRACTORS, FREELANCERS, ME, SIMULATED_APPLICANTS, buildSeed } from "../core/mock";
import type { Contractor, Job } from "../core/types";
import { migrateRoles } from "../core/roles";
import { StoreContext, useToasts, type Store } from "./context";
import { reducer, type State } from "./reducer";

// v2: jobs carry a full address (CEP lookup) and the demo data is in Joinville.
// v4: role catalog grew to 25 services (old role names are migrated).
const STORAGE_KEY = "freelas:v4";
// Same format, saved before the app was renamed from "Freelass".
const RENAMED_KEY = "freelass:v4";
const LEGACY_KEYS = ["freelass:v3", "freelass:v2", "freelass:v1"];

function initialState(today: Date): State {
  const seed = buildSeed(today);
  return { user: null, mode: "freelancer", ...seed };
}

interface Persisted {
  savedOn: string;
  state: State;
}

/**
 * Restores the saved session. Demo data is relative to "today", so on a
 * new day the jobs and applications are rebuilt and only the user stays.
 */
function loadState(today: Date): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(RENAMED_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      if (saved.savedOn === toISODate(today)) return saved.state;
      return { ...initialState(today), user: saved.state.user, mode: saved.state.mode };
    }
    // Older format: keep the account, rebuild jobs in the new shape.
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const saved = JSON.parse(legacy) as Persisted;
      return {
        ...initialState(today),
        user: migrateUser(saved.state.user),
        mode: saved.state.mode,
      };
    }
  } catch {
    // Storage blocked or corrupted: fall back to the seed.
  }
  return initialState(today);
}

/** Saved profiles may use role names from before the catalog grew. */
function migrateUser(user: State["user"]): State["user"] {
  if (!user?.freelancer) return user;
  return {
    ...user,
    freelancer: {
      ...user.freelancer,
      specialties: migrateRoles(user.freelancer.specialties as string[]),
    },
  };
}

/**
 * State lives only on the client. The server renders a splash, and
 * the store builds its date-relative seed after hydration.
 */
export default function DemoProvider({ children }: { children: ReactNode }) {
  const [today] = useState(() => new Date());
  const [state, dispatch] = useReducer(reducer, today, loadState);
  const { toasts, notify, timers } = useToasts();

  useEffect(() => {
    try {
      const saved: Persisted = { savedOn: toISODate(today), state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Persistence is a convenience only.
    }
  }, [state, today]);

  const contractorOf = useCallback(
    (job: Job): Contractor => {
      if (job.contractorId === ME) {
        const given = state.applications
          .filter(
            (a) =>
              a.freelancerReview &&
              state.jobs.some((j) => j.id === a.jobId && j.contractorId === ME),
          )
          .map((a) => a.freelancerReview!.stars);
        return {
          id: ME,
          name: state.user?.contratante?.businessName ?? "Meu estabelecimento",
          logoUrl: state.user?.contratante?.logoUrl,
          rating: averageStars(given),
          ratingCount: given.length,
        };
      }
      const base = CONTRACTORS.find((c) => c.id === job.contractorId) ?? {
        id: job.contractorId,
        name: "Contratante",
        rating: 0,
        ratingCount: 0,
      };
      // Include ratings the user gave this contractor in the demo.
      const given = state.applications
        .filter(
          (a) =>
            a.freelancerReview &&
            state.jobs.some((j) => j.id === a.jobId && j.contractorId === base.id),
        )
        .map((a) => a.freelancerReview!.stars);
      return { ...base, ...mergeRating(base, given) };
    },
    [state.applications, state.jobs, state.user],
  );

  const freelancerOf = useCallback(
    (id: string) => {
      const base = FREELANCERS.find((f) => f.id === id);
      if (!base) return undefined;
      // Include ratings the user gave this freelancer in the demo.
      const given = state.applications
        .filter((a) => a.freelancerId === id && a.contractorReview)
        .map((a) => a.contractorReview!.stars);
      return { ...base, ...mergeRating(base, given) };
    },
    [state.applications],
  );

  const publishJob = useCallback<Store["publishJob"]>(
    (job) => {
      const id = `job_${Date.now().toString(36)}`;
      dispatch({ type: "publish_job", job, id, now: new Date().toISOString() });
      SIMULATED_APPLICANTS.slice(0, 3).forEach((freelancerId, i) => {
        timers.current.push(
          setTimeout(
            () => {
              dispatch({
                type: "incoming_applicant",
                jobId: id,
                freelancerId,
                now: new Date().toISOString(),
              });
              const f = FREELANCERS.find((x) => x.id === freelancerId);
              if (f) notify(`${f.name} se candidatou para ${job.role}`);
            },
            4000 + i * 3500,
          ),
        );
      });
      return id;
    },
    [notify, timers],
  );

  const resetDemo = useCallback(() => {
    dispatch({ type: "reset_data", seed: buildSeed(today) });
    notify("Dados de demonstração restaurados");
  }, [today, notify]);

  const value = useMemo<Store>(
    () => ({
      state,
      dispatch,
      today,
      backend: "demo",
      contractorOf,
      freelancerOf,
      publishJob,
      resetDemo,
      // Demo data lives on the device; there is nothing newer to fetch.
      reload: async () => {},
      toasts,
      notify,
    }),
    [state, today, contractorOf, freelancerOf, publishJob, resetDemo, toasts, notify],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
