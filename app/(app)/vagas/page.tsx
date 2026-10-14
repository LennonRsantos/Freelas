"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { JobDetailsModal } from "@/components/job-details-modal";
import { JobTicket } from "@/components/job-ticket";
import { PageHeader } from "@/components/page-header";
import { RegionFilter, describeRegion } from "@/components/region-filter";
import { RoleFilter } from "@/components/role-picker";
import { RequireProfile } from "@/components/require-profile";
import { ApplicationBadge, Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import {
  DEFAULT_FILTERS,
  filterJobs,
  formatMoney,
  listRegions,
  parseISODate,
  samePlace,
  toISODate,
  type DateFilter,
  type JobFilters,
} from "@/lib/core/logic";
import { ME } from "@/lib/core/ids";
import type { Job, Role } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "todas", label: "Qualquer data" },
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "dia", label: "Escolher dia" },
];

const PAY_PRESETS = [0, 120, 150, 200];
const CUSTOM_PAY = "outro";

const dayLabel = (iso: string) =>
  parseISODate(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

export default function VagasPage() {
  return (
    <RequireProfile mode="freelancer">
      <Feed />
    </RequireProfile>
  );
}

function Feed() {
  const { state, dispatch, today, contractorOf, notify } = useFreelas();
  const [details, setDetails] = useState<Job | null>(null);

  // Open jobs, the user's own included (shown, but not open to their application).
  const open = useMemo(() => filterJobs(state.jobs, DEFAULT_FILTERS, today), [state.jobs, today]);
  const isMine = (job: Job) => job.contractorId === ME;
  const regions = useMemo(() => listRegions(open), [open]);

  // Start in the freelancer's own city when it has open jobs.
  const homeCity = state.user?.freelancer?.address?.city ?? "";
  const [filters, setFilters] = useState<JobFilters>(() => ({
    ...DEFAULT_FILTERS,
    city: regions.find((r) => samePlace(r.city, homeCity))?.city ?? "",
  }));
  const jobs = useMemo(() => filterJobs(open, filters, today), [open, filters, today]);
  // Open jobs per role under the other filters (region, date, pay).
  const roleCounts = useMemo(() => {
    const counts = new Map<Role, number>();
    for (const j of filterJobs(open, { ...filters, role: "todas" }, today)) {
      counts.set(j.role, (counts.get(j.role) ?? 0) + 1);
    }
    return counts;
  }, [open, filters, today]);
  // Manual minimum pay, shown when "Outro valor" is picked.
  const [customPay, setCustomPay] = useState(false);
  const todayISO = toISODate(today);
  const myApp = (jobId: string) =>
    state.applications.find((a) => a.jobId === jobId && a.freelancerId === ME);

  function apply(job: Job) {
    dispatch({ type: "apply", jobId: job.id, now: new Date().toISOString() });
    notify(`Candidatura enviada para ${contractorOf(job).name}`);
  }

  const firstName = state.user?.freelancer?.fullName.split(" ")[0];
  const set = (patch: Partial<JobFilters>) => setFilters((f) => ({ ...f, ...patch }));

  function actionFor(job: Job) {
    if (isMine(job)) {
      return (
        <>
          <Badge tone="navy">Sua vaga</Badge>
          <Link
            href={`/contratar/vagas/${job.id}`}
            className={buttonStyles({ variant: "outline", size: "sm" })}
          >
            Gerenciar
          </Link>
        </>
      );
    }
    const app = myApp(job.id);
    if (app) return <ApplicationBadge status={app.status} />;
    return (
      <Button variant="cta" onClick={() => apply(job)}>
        Me candidatar
      </Button>
    );
  }

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Vagas abertas"}
        description={`${
          jobs.length === 0
            ? "Nenhum turno aberto"
            : jobs.length === 1
              ? "1 turno aberto"
              : `${jobs.length} turnos abertos`
        }${filters.role !== "todas" ? ` de ${filters.role}` : ""} ${describeRegion(filters)}${
          filters.date === "dia" && filters.day ? ` no dia ${dayLabel(filters.day)}` : ""
        }${filters.minPay > 0 ? `, a partir de ${formatMoney(filters.minPay)}` : ""}.`}
      />

      <section aria-label="Filtros" className="mb-6 flex flex-col gap-3">
        <RegionFilter
          regions={regions}
          value={{ city: filters.city, neighborhood: filters.neighborhood }}
          onChange={(region) => set(region)}
        />
        <RoleFilter value={filters.role} onChange={(role) => set({ role })} counts={roleCounts} />
        <div className="grid grid-cols-2 items-start gap-3 sm:max-w-md">
          <div className="flex flex-col gap-2">
            <label className="sr-only" htmlFor="f-date">
              Data
            </label>
            <Select
              id="f-date"
              value={filters.date}
              onChange={(e) => {
                const date = e.target.value as DateFilter;
                set({ date, day: date === "dia" ? filters.day || todayISO : "" });
              }}
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {filters.date === "dia" && (
              <>
                <label className="sr-only" htmlFor="f-day">
                  Dia do turno
                </label>
                <Input
                  id="f-day"
                  type="date"
                  min={todayISO}
                  value={filters.day}
                  onChange={(e) => set({ day: e.target.value })}
                />
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="sr-only" htmlFor="f-pay">
              Valor mínimo
            </label>
            <Select
              id="f-pay"
              value={customPay ? CUSTOM_PAY : filters.minPay}
              onChange={(e) => {
                if (e.target.value === CUSTOM_PAY) {
                  setCustomPay(true);
                  return;
                }
                setCustomPay(false);
                set({ minPay: Number(e.target.value) });
              }}
            >
              {PAY_PRESETS.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "Qualquer valor" : `A partir de ${formatMoney(v)}`}
                </option>
              ))}
              <option value={CUSTOM_PAY}>Outro valor</option>
            </Select>
            {customPay && (
              <div className="relative">
                <label className="sr-only" htmlFor="f-pay-custom">
                  Valor mínimo em reais
                </label>
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted"
                >
                  R$
                </span>
                <Input
                  id="f-pay-custom"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={10}
                  placeholder="A partir de"
                  autoFocus
                  value={filters.minPay || ""}
                  onChange={(e) => set({ minPay: Math.max(0, Number(e.target.value) || 0) })}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {jobs.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={
            filters.neighborhood
              ? `Nenhuma vaga aberta ${describeRegion(filters)}`
              : "Nenhum turno com esses filtros"
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {filters.neighborhood && (
                <Button variant="primary" onClick={() => set({ neighborhood: "" })}>
                  Ver todos os bairros de {filters.city}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setCustomPay(false);
                  setFilters(DEFAULT_FILTERS);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          }
        >
          {filters.neighborhood
            ? "Veja os bairros próximos ou amplie a data e o valor."
            : "Amplie a região, a data ou reduza o valor mínimo para ver mais vagas."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobTicket
                job={job}
                contractor={contractorOf(job)}
                today={today}
                className="h-full"
                action={
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetails(job)}>
                      Detalhes
                    </Button>
                    {actionFor(job)}
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {details && (
        <JobDetailsModal
          job={details}
          contractor={contractorOf(details)}
          open
          onOpenChange={(o) => !o && setDetails(null)}
          footer={
            isMine(details) ? (
              <div className="flex flex-col gap-2">
                <p className="text-center text-sm text-muted">
                  Esta vaga é sua. Você não pode se candidatar a ela.
                </p>
                <Link
                  href={`/contratar/vagas/${details.id}`}
                  className={buttonStyles({ variant: "primary", size: "lg", block: true })}
                >
                  Ver candidatos
                </Link>
              </div>
            ) : myApp(details.id) ? (
              <p className="text-center text-sm text-muted">Você já se candidatou a este turno.</p>
            ) : (
              <Button
                variant="cta"
                size="lg"
                block
                onClick={() => {
                  apply(details);
                  setDetails(null);
                }}
              >
                Me candidatar
              </Button>
            )
          }
        />
      )}
    </>
  );
}
