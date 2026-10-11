// Supabase data layer: loads everything the screens need into the same
// State shape the demo uses, and turns app actions into database calls.
// The signed-in user's id is mapped to ME, so screens never see UUIDs.
import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "../core/logic";
import { ME } from "../core/ids";
import type {
  Address,
  Application,
  ContratanteProfile,
  Contractor,
  FreelancerCard,
  FreelancerProfile,
  Job,
  Review,
  User,
} from "../core/types";
import type { Action, Directory } from "../store/reducer";

/* eslint-disable @typescript-eslint/no-explicit-any -- database rows */
type Row = Record<string, any>;

export interface Snapshot {
  user: User;
  jobs: Job[];
  applications: Application[];
  directory: Directory;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const addressOf = (r: Row): Address => ({
  cep: r.cep,
  street: r.street,
  number: r.number,
  complement: r.complement ?? undefined,
  neighborhood: r.neighborhood,
  city: r.city,
  state: r.state,
});

const addressColumns = (a: Address) => ({
  cep: a.cep,
  street: a.street,
  number: a.number,
  complement: a.complement ?? null,
  neighborhood: a.neighborhood,
  city: a.city,
  state: a.state,
});

const reviewOf = (r: Row | undefined): Review | undefined =>
  r && { stars: r.stars, tags: r.tags ?? [], comment: r.comment, createdAt: r.created_at };

/** Loads the signed-in user's world: profile, open jobs, their own work. */
export async function fetchSnapshot(
  sb: SupabaseClient,
  uid: string,
  email: string,
  today: Date,
): Promise<Snapshot> {
  const local = (id: string) => (id === uid ? ME : id);
  const todayISO = toISODate(today);

  const [fp, cp, openJobs, myJobs, myApps] = await Promise.all([
    sb.from("freelancer_profiles").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("contratante_profiles").select("*").eq("user_id", uid).maybeSingle(),
    sb
      .from("jobs")
      .select("*")
      .in("status", ["aberta", "preenchida"])
      .gte("date", todayISO)
      .order("date")
      .limit(500),
    sb.from("jobs").select("*").eq("contractor_id", uid),
    sb.from("applications").select("*").eq("freelancer_id", uid),
  ]);

  const jobRows = new Map<string, Row>();
  for (const j of [...must<Row[]>(openJobs), ...must<Row[]>(myJobs)]) jobRows.set(j.id, j);
  const myJobIds = must<Row[]>(myJobs).map((j) => j.id as string);
  const missing = must<Row[]>(myApps)
    .map((a) => a.job_id as string)
    .filter((id) => !jobRows.has(id));

  const [appliedJobs, appsOnMine] = await Promise.all([
    missing.length ? sb.from("jobs").select("*").in("id", missing) : { data: [], error: null },
    myJobIds.length
      ? sb.from("applications").select("*").in("job_id", myJobIds)
      : { data: [], error: null },
  ]);
  for (const j of must<Row[]>(appliedJobs)) jobRows.set(j.id, j);

  const appRows = new Map<string, Row>();
  for (const a of [...must<Row[]>(myApps), ...must<Row[]>(appsOnMine)]) appRows.set(a.id, a);
  const appIds = [...appRows.keys()];

  const contractorIds = [...new Set([...jobRows.values()].map((j) => j.contractor_id as string))];
  const freelancerIds = [...new Set([...appRows.values()].map((a) => a.freelancer_id as string))];

  const [reviews, contractorCards, freelancerCards] = await Promise.all([
    appIds.length
      ? sb.from("reviews").select("*").in("application_id", appIds)
      : { data: [], error: null },
    contractorIds.length
      ? sb.from("contractor_cards").select("*").in("user_id", contractorIds)
      : { data: [], error: null },
    freelancerIds.length
      ? sb.from("freelancer_cards").select("*").in("user_id", freelancerIds)
      : { data: [], error: null },
  ]);

  const reviewsByApp = new Map<string, { contratante?: Row; freelancer?: Row }>();
  for (const r of must<Row[]>(reviews)) {
    const entry = reviewsByApp.get(r.application_id) ?? {};
    entry[r.author_role as "contratante" | "freelancer"] = r;
    reviewsByApp.set(r.application_id, entry);
  }

  const jobs: Job[] = [...jobRows.values()].map((r) => ({
    id: r.id,
    contractorId: local(r.contractor_id),
    role: r.role,
    slots: r.slots,
    date: r.date,
    start: String(r.start_time).slice(0, 5),
    end: String(r.end_time).slice(0, 5),
    pay: Number(r.pay),
    ...addressOf(r),
    lat: r.lat,
    lng: r.lng,
    dressCode: r.dress_code,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  }));

  const applications: Application[] = [...appRows.values()].map((r) => ({
    id: r.id,
    jobId: r.job_id,
    freelancerId: local(r.freelancer_id),
    status: r.status,
    appliedAt: r.applied_at,
    checkInAt: r.check_in_at ?? undefined,
    cancelledBy: r.cancelled_by ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    contractorReview: reviewOf(reviewsByApp.get(r.id)?.contratante),
    freelancerReview: reviewOf(reviewsByApp.get(r.id)?.freelancer),
  }));

  const contractors: Contractor[] = must<Row[]>(contractorCards).map((c) => ({
    id: local(c.user_id),
    name: c.business_name,
    logoUrl: c.logo_url ?? undefined,
    rating: Number(c.rating),
    ratingCount: Number(c.rating_count),
  }));

  const freelancers: FreelancerCard[] = must<Row[]>(freelancerCards).map((f) => ({
    id: local(f.user_id),
    name: f.full_name,
    photoUrl: f.photo_url ?? undefined,
    specialties: f.specialties ?? [],
    homeArea: `${f.neighborhood}, ${f.city}`,
    rating: Number(f.rating),
    ratingCount: Number(f.rating_count),
    attendanceRate: f.attendance_rate === null ? null : Number(f.attendance_rate),
  }));

  const f = must<Row | null>(fp);
  const c = must<Row | null>(cp);
  const freelancer: FreelancerProfile | undefined = f
    ? {
        fullName: f.full_name,
        photoUrl: f.photo_url ?? undefined,
        phone: f.phone,
        cpf: f.cpf,
        specialties: f.specialties ?? [],
        bio: f.bio ?? "",
        pixKey: f.pix_key,
        address: addressOf(f),
      }
    : undefined;
  const contratante: ContratanteProfile | undefined = c
    ? {
        businessName: c.business_name,
        document: c.document,
        manager: c.manager,
        address: addressOf(c),
        logoUrl: c.logo_url ?? undefined,
      }
    : undefined;

  return {
    user: { id: ME, email, freelancer, contratante },
    jobs,
    applications,
    directory: { contractors, freelancers },
  };
}

async function rpc(sb: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
}

/** Sends one app action to Supabase. Actions with no server side are ignored. */
export async function runAction(sb: SupabaseClient, uid: string, action: Action): Promise<void> {
  switch (action.type) {
    case "save_freelancer": {
      const p = action.profile;
      if (!p.address) throw new Error("Informe o endereço pelo CEP.");
      must(
        await sb.from("freelancer_profiles").upsert({
          user_id: uid,
          full_name: p.fullName,
          photo_url: p.photoUrl ?? null,
          phone: p.phone,
          cpf: p.cpf,
          specialties: p.specialties,
          bio: p.bio,
          pix_key: p.pixKey,
          ...addressColumns(p.address),
        }),
      );
      return;
    }
    case "save_contratante": {
      const p = action.profile;
      if (typeof p.address !== "object") throw new Error("Informe o endereço pelo CEP.");
      must(
        await sb.from("contratante_profiles").upsert({
          user_id: uid,
          business_name: p.businessName,
          document: p.document,
          manager: p.manager,
          logo_url: p.logoUrl ?? null,
          ...addressColumns(p.address),
        }),
      );
      return;
    }
    case "publish_job": {
      const j = action.job;
      must(
        await sb.from("jobs").insert({
          id: action.id,
          contractor_id: uid,
          role: j.role,
          slots: j.slots,
          date: j.date,
          start_time: j.start,
          end_time: j.end,
          pay: j.pay,
          ...addressColumns(j),
          lat: j.lat,
          lng: j.lng,
          dress_code: j.dressCode,
          notes: j.notes ?? null,
        }),
      );
      return;
    }
    case "apply":
      return rpc(sb, "apply_to_job", { p_job_id: action.jobId });
    case "withdraw":
      return rpc(sb, "withdraw_application", { p_application_id: action.applicationId });
    case "cancel_application":
      return rpc(sb, "cancel_application", { p_application_id: action.applicationId });
    case "check_in":
      if (!action.coords) throw new Error("Não foi possível obter sua localização.");
      return rpc(sb, "check_in", {
        p_application_id: action.applicationId,
        p_lat: action.coords.lat,
        p_lng: action.coords.lng,
      });
    case "decide":
      return rpc(sb, "decide_application", {
        p_application_id: action.applicationId,
        p_decision: action.decision,
      });
    case "finish_shift":
      return rpc(sb, "finish_shift", { p_job_id: action.jobId });
    case "cancel_job":
      return rpc(sb, "cancel_job", { p_job_id: action.jobId });
    case "review":
      return rpc(sb, "submit_review", {
        p_application_id: action.applicationId,
        p_author_role: action.by,
        p_stars: action.review.stars,
        p_tags: action.review.tags,
        p_comment: action.review.comment ?? "",
      });
    case "sign_out":
      await sb.auth.signOut();
      return;
    default:
      // set_mode, sign_up and demo-only actions live on the device.
      return;
  }
}
