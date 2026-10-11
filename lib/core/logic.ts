// Pure business rules. No React, no DOM.
import { FEATURES } from "./features";
import type {
  Address,
  Application,
  ContratanteProfile,
  FreelancerProfile,
  Job,
  Role,
} from "./types";

export const CHECKIN_RADIUS_METERS = 300;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
export const formatMoney = (value: number) => currency.format(value);

/** "sáb", "14 out" — split so the UI can stack them. */
export function formatDateParts(iso: string) {
  const d = parseISODate(iso);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const day = d.getDate();
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return { weekday, day, month };
}

export function relativeDayLabel(iso: string, today: Date): string | null {
  const diff = Math.round(
    (parseISODate(iso).getTime() - parseISODate(toISODate(today)).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return null;
}

/** Shift length in hours; handles shifts that end after midnight. */
export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatHours(h: number): string {
  return `${h.toLocaleString("pt-BR")} h`;
}

/** Haversine distance in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** "dia" = one specific day picked on the calendar (JobFilters.day). */
export type DateFilter = "todas" | "hoje" | "amanha" | "semana" | "dia";

export interface JobFilters {
  role: Role | "todas";
  /** "" means any city / any neighborhood. */
  city: string;
  neighborhood: string;
  date: DateFilter;
  /** YYYY-MM-DD, used when date is "dia". */
  day: string;
  /** Minimum pay in R$; 0 = any. */
  minPay: number;
}

export const DEFAULT_FILTERS: JobFilters = {
  role: "todas",
  city: "",
  neighborhood: "",
  date: "todas",
  day: "",
  minPay: 0,
};

export function filterJobs(jobs: Job[], f: JobFilters, today: Date): Job[] {
  const t = toISODate(today);
  const tomorrow = toISODate(addDays(today, 1));
  const weekEnd = toISODate(addDays(today, 7));
  return jobs
    .filter((j) => j.status === "aberta" && j.date >= t)
    .filter((j) => f.role === "todas" || j.role === f.role)
    .filter((j) => !f.city || samePlace(j.city, f.city))
    .filter((j) => !f.neighborhood || samePlace(j.neighborhood, f.neighborhood))
    .filter((j) => j.pay >= f.minPay)
    .filter((j) => {
      if (f.date === "hoje") return j.date === t;
      if (f.date === "amanha") return j.date === tomorrow;
      if (f.date === "semana") return j.date <= weekEnd;
      if (f.date === "dia") return !f.day || j.date === f.day;
      return true;
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export function confirmedCount(jobId: string, apps: Application[]): number {
  return apps.filter(
    (a) => a.jobId === jobId && (a.status === "confirmada" || a.status === "concluida"),
  ).length;
}

/** Freelancer can check in on the day of the shift, once. */
/**
 * Presence %: finished shifts over finished + shifts the freelancer called
 * off. With check-in on, a finished shift counts only if they checked in.
 */
export function attendanceRate(apps: Application[]): number | null {
  const finished = apps.filter((a) => a.status === "concluida");
  const dropped = apps.filter((a) => a.status === "cancelada" && a.cancelledBy === "freelancer");
  const total = finished.length + dropped.length;
  if (total === 0) return null;
  const showedUp = FEATURES.checkIn ? finished.filter((a) => a.checkInAt).length : finished.length;
  return Math.round((showedUp / total) * 100);
}

export function canCheckIn(app: Application, job: Job, today: Date): boolean {
  return app.status === "confirmada" && !app.checkInAt && job.date === toISODate(today);
}

export function averageStars(stars: number[]): number {
  if (stars.length === 0) return 0;
  return Math.round((stars.reduce((s, x) => s + x, 0) / stars.length) * 10) / 10;
}

/** Adds new star ratings to an existing average. */
export function mergeRating(
  base: { rating: number; ratingCount: number },
  stars: number[],
): { rating: number; ratingCount: number } {
  const ratingCount = base.ratingCount + stars.length;
  if (ratingCount === 0) return { rating: 0, ratingCount };
  const total = base.rating * base.ratingCount + stars.reduce((s, x) => s + x, 0);
  return { rating: Math.round((total / ratingCount) * 10) / 10, ratingCount };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function maskCEP(v: string): string {
  return onlyDigits(v)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatAddress(a: Address): string {
  const line = [a.street, a.number].filter(Boolean).join(", ");
  const extra = a.complement ? ` (${a.complement})` : "";
  return `${line}${extra}, ${a.neighborhood}, ${a.city}/${a.state}, CEP ${a.cep}`;
}

/** Public part of the address, shown to contractors. */
export function homeArea(a: Address): string {
  return `${a.neighborhood}, ${a.city}`;
}

export function isContratanteProfileComplete(p: ContratanteProfile | undefined): boolean {
  return Boolean(p && typeof p.address === "object" && p.address.cep);
}

/** Lowercase, no accents: "Iririú" and "iririu" match. */
export function normalizePlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export const samePlace = (a: string, b: string) => normalizePlace(a) === normalizePlace(b);

export function isFreelancerProfileComplete(p: FreelancerProfile | undefined): boolean {
  return Boolean(p?.address?.cep && p.address.number && p.address.city);
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function maskCPF(v: string): string {
  return onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(v: string): string {
  return onlyDigits(v)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskDocument(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) return maskCPF(d);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export interface Region {
  city: string;
  state: string;
  neighborhoods: { name: string; count: number }[];
  count: number;
}

/** Cities and neighborhoods that have jobs, with job counts, sorted by name. */
export function listRegions(jobs: Job[]): Region[] {
  const byCity = new Map<string, Region>();
  for (const j of jobs) {
    const key = normalizePlace(j.city);
    const region = byCity.get(key) ?? { city: j.city, state: j.state, neighborhoods: [], count: 0 };
    region.count++;
    const n = region.neighborhoods.find((x) => samePlace(x.name, j.neighborhood));
    if (n) n.count++;
    else region.neighborhoods.push({ name: j.neighborhood, count: 1 });
    byCity.set(key, region);
  }
  const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return [...byCity.values()]
    .map((r) => ({ ...r, neighborhoods: r.neighborhoods.sort((a, b) => byName(a.name, b.name)) }))
    .sort((a, b) => byName(a.city, b.city));
}
