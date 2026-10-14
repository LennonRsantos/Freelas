// State + reducer with no React import, so it can run unchanged
// in React Native (useReducer) or be swapped for Supabase calls.
import { confirmedCount, uid } from "../core/logic";
import { ME } from "../core/ids";
import type {
  Application,
  Contractor,
  ContratanteProfile,
  FreelancerCard,
  FreelancerProfile,
  Job,
  Review,
  User,
  ViewMode,
} from "../core/types";

/** People and businesses shown on cards. Filled from Supabase; the demo uses mock.ts. */
export interface Directory {
  contractors: Contractor[];
  freelancers: FreelancerCard[];
}

export interface State {
  user: User | null;
  mode: ViewMode;
  jobs: Job[];
  applications: Application[];
  directory?: Directory;
}

export type Action =
  | { type: "sign_up"; email: string; mode: ViewMode }
  | { type: "save_freelancer"; profile: FreelancerProfile }
  | { type: "save_contratante"; profile: ContratanteProfile }
  | { type: "set_mode"; mode: ViewMode }
  | { type: "apply"; jobId: string; now: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "cancel_application"; applicationId: string; now: string }
  | { type: "cancel_job"; jobId: string; now: string }
  | { type: "cancel_hire"; applicationId: string; now: string }
  | {
      type: "check_in";
      applicationId: string;
      now: string;
      /** Device position; the server re-checks the distance. */
      coords?: { lat: number; lng: number };
    }
  | {
      type: "publish_job";
      job: Omit<Job, "id" | "contractorId" | "status" | "createdAt">;
      now: string;
      id?: string;
    }
  | { type: "decide"; applicationId: string; decision: "confirmada" | "recusada" }
  | { type: "finish_shift"; jobId: string }
  | { type: "review"; applicationId: string; by: ViewMode; review: Review }
  | { type: "incoming_applicant"; jobId: string; freelancerId: string; now: string }
  | { type: "reset_data"; seed: Pick<State, "jobs" | "applications"> }
  | { type: "sign_out" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "sign_up":
      return {
        ...state,
        user: { id: ME, email: action.email },
        mode: action.mode,
      };

    case "save_freelancer":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, freelancer: action.profile } };

    case "save_contratante":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, contratante: action.profile } };

    case "set_mode":
      return { ...state, mode: action.mode };

    case "apply": {
      const exists = state.applications.some(
        (a) => a.jobId === action.jobId && a.freelancerId === ME,
      );
      if (exists) return state;
      return {
        ...state,
        applications: [
          ...state.applications,
          {
            id: uid("app"),
            jobId: action.jobId,
            freelancerId: ME,
            status: "em_analise",
            appliedAt: action.now,
          },
        ],
      };
    }

    case "withdraw":
      return {
        ...state,
        applications: state.applications.filter((a) => a.id !== action.applicationId),
      };

    case "check_in":
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.applicationId ? { ...a, checkInAt: action.now } : a,
        ),
      };

    case "publish_job":
      return {
        ...state,
        jobs: [
          {
            ...action.job,
            id: action.id ?? uid("job"),
            contractorId: ME,
            status: "aberta",
            createdAt: action.now,
          },
          ...state.jobs,
        ],
      };

    case "decide": {
      const applications = state.applications.map((a) =>
        a.id === action.applicationId ? { ...a, status: action.decision } : a,
      );
      const app = applications.find((a) => a.id === action.applicationId);
      if (!app) return state;
      const jobs = state.jobs.map((j) => {
        if (j.id !== app.jobId || j.status === "encerrada") return j;
        const full = confirmedCount(j.id, applications) >= j.slots;
        return { ...j, status: full ? ("preenchida" as const) : ("aberta" as const) };
      });
      return { ...state, applications, jobs };
    }

    case "cancel_application":
    case "cancel_hire": {
      // A confirmed shift is called off (by the freelancer or the contractor); the slot opens again.
      const cancelledBy: ViewMode = action.type === "cancel_hire" ? "contratante" : "freelancer";
      const applications = state.applications.map((a) =>
        a.id === action.applicationId
          ? {
              ...a,
              status: "cancelada" as const,
              cancelledBy,
              cancelledAt: action.now,
            }
          : a,
      );
      const app = applications.find((a) => a.id === action.applicationId);
      const jobs = state.jobs.map((j) =>
        app && j.id === app.jobId && j.status === "preenchida"
          ? { ...j, status: "aberta" as const }
          : j,
      );
      return { ...state, applications, jobs };
    }

    case "cancel_job":
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === action.jobId ? { ...j, status: "cancelada" } : j)),
        applications: state.applications.map((a) =>
          a.jobId === action.jobId && (a.status === "em_analise" || a.status === "confirmada")
            ? { ...a, status: "cancelada", cancelledBy: "contratante", cancelledAt: action.now }
            : a,
        ),
      };

    case "finish_shift":
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === action.jobId ? { ...j, status: "encerrada" } : j)),
        applications: state.applications.map((a) => {
          if (a.jobId !== action.jobId) return a;
          if (a.status === "confirmada") return { ...a, status: "concluida" };
          if (a.status === "em_analise") return { ...a, status: "recusada" };
          return a;
        }),
      };

    case "review":
      return {
        ...state,
        applications: state.applications.map((a) => {
          if (a.id !== action.applicationId) return a;
          return action.by === "contratante"
            ? { ...a, contractorReview: action.review }
            : { ...a, freelancerReview: action.review };
        }),
      };

    case "incoming_applicant": {
      const dup = state.applications.some(
        (a) => a.jobId === action.jobId && a.freelancerId === action.freelancerId,
      );
      if (dup) return state;
      return {
        ...state,
        applications: [
          ...state.applications,
          {
            id: uid("app"),
            jobId: action.jobId,
            freelancerId: action.freelancerId,
            status: "em_analise",
            appliedAt: action.now,
          },
        ],
      };
    }

    case "reset_data":
      return { ...state, ...action.seed };

    case "sign_out":
      return { ...state, user: null };
  }
}
