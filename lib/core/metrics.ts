// Dashboard metrics. Pure functions over jobs and applications, so the
// same numbers can come from Supabase (or a SQL view) later.
import { attendanceRate, averageStars, parseISODate, shiftHours, toISODate } from "./logic";
import { ME } from "./mock";
import type { Application, Job, Role } from "./types";

export interface MonthPoint {
  key: string; // YYYY-MM
  label: string; // "mai"
  value: number; // R$
  count: number; // shifts / hires
}

export interface RolePoint {
  role: Role;
  value: number;
  count: number;
}

export interface Metrics {
  /** R$ earned (freelancer) or paid to the team (contractor), all time. */
  total: number;
  thisMonth: number;
  lastMonth: number;
  /** Finished shifts worked, or professionals hired. */
  count: number;
  hours: number;
  /** R$ per shift (freelancer) or per professional (contractor). */
  average: number;
  rating: number;
  ratingCount: number;
  /** Freelancer: attendance %. Contractor: fill rate %. Null when no data. */
  rate: number | null;
  /** Confirmed upcoming value (freelancer) or open jobs (contractor). */
  upcomingValue: number;
  upcomingCount: number;
  cancelled: number;
  /** Contractor only: jobs offered (not cancelled). */
  offered: number;
  since: string | null; // first finished job date
  byMonth: MonthPoint[];
  byRole: RolePoint[];
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

/** The last `n` calendar months ending in today's month, oldest first. */
function lastMonths(today: Date, n: number): { key: string; label: string }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({
      key: toISODate(d).slice(0, 7),
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    });
  }
  return out;
}

function summarize(
  finished: { job: Job; app: Application }[],
  today: Date,
): Pick<
  Metrics,
  | "total"
  | "thisMonth"
  | "lastMonth"
  | "count"
  | "hours"
  | "average"
  | "since"
  | "byMonth"
  | "byRole"
> {
  const total = finished.reduce((s, r) => s + r.job.pay, 0);
  const thisKey = monthKey(toISODate(today));
  const lastKey = monthKey(toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
  const sumMonth = (k: string) =>
    finished.filter((r) => monthKey(r.job.date) === k).reduce((s, r) => s + r.job.pay, 0);

  const byMonth = lastMonths(today, 6).map(({ key, label }) => {
    const inMonth = finished.filter((r) => monthKey(r.job.date) === key);
    return {
      key,
      label,
      value: inMonth.reduce((s, r) => s + r.job.pay, 0),
      count: inMonth.length,
    };
  });

  const roles = new Map<Role, RolePoint>();
  for (const { job } of finished) {
    const p = roles.get(job.role) ?? { role: job.role, value: 0, count: 0 };
    p.value += job.pay;
    p.count++;
    roles.set(job.role, p);
  }

  const dates = finished.map((r) => r.job.date).sort();
  return {
    total,
    thisMonth: sumMonth(thisKey),
    lastMonth: sumMonth(lastKey),
    count: finished.length,
    hours: finished.reduce((s, r) => s + shiftHours(r.job.start, r.job.end), 0),
    average: finished.length ? Math.round(total / finished.length) : 0,
    since: dates[0] ?? null,
    byMonth,
    byRole: [...roles.values()].sort((a, b) => b.value - a.value),
  };
}

function join(apps: Application[], jobs: Job[]) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return apps.flatMap((app) => {
    const job = byId.get(app.jobId);
    return job ? [{ app, job }] : [];
  });
}

/** Metrics for the user working as a freelancer. */
export function freelancerMetrics(jobs: Job[], apps: Application[], today: Date): Metrics {
  const mine = join(
    apps.filter((a) => a.freelancerId === ME),
    jobs,
  );
  const finished = mine.filter((r) => r.app.status === "concluida");
  const todayISO = toISODate(today);
  const upcoming = mine.filter((r) => r.app.status === "confirmada" && r.job.date >= todayISO);
  const received = finished.flatMap((r) =>
    r.app.contractorReview ? [r.app.contractorReview.stars] : [],
  );

  return {
    ...summarize(finished, today),
    rating: averageStars(received),
    ratingCount: received.length,
    rate: attendanceRate(mine.map((r) => r.app)),
    upcomingValue: upcoming.reduce((s, r) => s + r.job.pay, 0),
    upcomingCount: upcoming.length,
    cancelled: mine.filter((r) => r.app.status === "cancelada").length,
    offered: 0,
  };
}

/** Metrics for the user's establishment. */
export function contractorMetrics(jobs: Job[], apps: Application[], today: Date): Metrics {
  const myJobs = jobs.filter((j) => j.contractorId === ME);
  const ids = new Set(myJobs.map((j) => j.id));
  const rows = join(
    apps.filter((a) => ids.has(a.jobId)),
    myJobs,
  );
  const finished = rows.filter((r) => r.app.status === "concluida");
  const received = finished.flatMap((r) =>
    r.app.freelancerReview ? [r.app.freelancerReview.stars] : [],
  );
  const closed = myJobs.filter((j) => j.status === "encerrada");
  const slots = closed.reduce((s, j) => s + j.slots, 0);
  const filled = finished.filter((r) => r.job.status === "encerrada").length;
  const todayISO = toISODate(today);
  const upcoming = myJobs.filter(
    (j) => (j.status === "aberta" || j.status === "preenchida") && j.date >= todayISO,
  );

  return {
    ...summarize(finished, today),
    rating: averageStars(received),
    ratingCount: received.length,
    rate: slots ? Math.round((filled / slots) * 100) : null,
    upcomingValue: upcoming.reduce((s, j) => s + j.pay * j.slots, 0),
    upcomingCount: upcoming.length,
    cancelled: myJobs.filter((j) => j.status === "cancelada").length,
    offered: myJobs.filter((j) => j.status !== "cancelada").length,
  };
}

/** "+12%" / "−8%" vs last month, or null when there is no base. */
export function monthDelta(m: Pick<Metrics, "thisMonth" | "lastMonth">): number | null {
  if (!m.lastMonth) return null;
  return Math.round(((m.thisMonth - m.lastMonth) / m.lastMonth) * 100);
}

export function formatMonthYear(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
