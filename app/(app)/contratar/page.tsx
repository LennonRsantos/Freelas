"use client";

import { Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { ApplicantRow } from "@/components/applicant-row";
import { JobTicket } from "@/components/job-ticket";
import { PageHeader } from "@/components/page-header";
import { RequireProfile } from "@/components/require-profile";
import { JobStatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { confirmedCount, formatDateParts, toISODate } from "@/lib/core/logic";
import { FEATURES } from "@/lib/core/features";
import { ME } from "@/lib/core/ids";
import { useFreelas } from "@/lib/store/freelas-store";

export default function ContratarPage() {
  return (
    <RequireProfile mode="contratante">
      <Dashboard />
    </RequireProfile>
  );
}

function Dashboard() {
  const { state, today, contractorOf, freelancerOf } = useFreelas();
  const todayISO = toISODate(today);
  const myJobs = state.jobs.filter((j) => j.contractorId === ME);
  const active = myJobs.filter((j) => j.status === "aberta" || j.status === "preenchida");
  const todays = active.filter((j) => j.date === todayISO);
  const pending = state.applications.filter(
    (a) => a.status === "em_analise" && active.some((j) => j.id === a.jobId),
  );

  const stats = [
    { label: "vagas ativas", value: active.length },
    { label: "candidatos aguardando", value: pending.length },
    { label: todays.length === 1 ? "turno hoje" : "turnos hoje", value: todays.length },
  ];

  return (
    <>
      <PageHeader
        title="Oferecer"
        description={`Vagas de ${state.user?.contratante?.businessName ?? "sua empresa"}: publique, aprove a equipe e acompanhe o dia.`}
        action={
          <Link href="/publicar" className={buttonStyles({ variant: "cta" })}>
            <Plus className="size-5" aria-hidden />
            Publicar vaga
          </Link>
        }
      />

      <dl className="mb-8 grid grid-cols-3 divide-x divide-line rounded-2xl bg-card py-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col-reverse px-3 text-center sm:px-6 sm:text-left"
          >
            <dt className="text-xs text-muted sm:text-sm">{s.label}</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {todays.length > 0 && (
        <section className="mb-10" aria-labelledby="today-title">
          <h2 id="today-title" className="mb-4 text-xl font-bold">
            Hoje
          </h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {todays.map((job) => {
              const here = state.applications.filter(
                (a) => a.jobId === job.id && a.checkInAt,
              ).length;
              return (
                <li key={job.id}>
                  <JobTicket
                    job={job}
                    contractor={contractorOf(job)}
                    today={today}
                    className="h-full"
                    meta={<JobStatusBadge status={job.status} />}
                    action={
                      <Link
                        href={`/contratar/vagas/${job.id}`}
                        className={buttonStyles({ variant: "primary", size: "sm" })}
                      >
                        Acompanhar
                      </Link>
                    }
                  >
                    <p className="text-sm text-ink-soft">
                      {FEATURES.checkIn ? (
                        <>
                          <span className="font-semibold text-ok-ink">{here}</span> de{" "}
                          {confirmedCount(job.id, state.applications)} confirmados fizeram check-in
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-ok-ink">
                            {confirmedCount(job.id, state.applications)}
                          </span>{" "}
                          de {job.slots} profissionais confirmados
                        </>
                      )}
                    </p>
                  </JobTicket>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="pending-title">
        <h2 id="pending-title" className="mb-4 text-xl font-bold">
          Aguardando sua resposta
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={Inbox} title="Nenhum candidato aguardando">
            Novas candidaturas aparecem aqui assim que chegam.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {active
              .filter((job) => pending.some((a) => a.jobId === job.id))
              .map((job) => {
                const { weekday, day, month } = formatDateParts(job.date);
                const filled = confirmedCount(job.id, state.applications);
                return (
                  <div key={job.id} className="rounded-2xl bg-card px-4 pt-4 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold">
                        {job.role}, {weekday} {day} {month}
                      </h3>
                      <Link
                        href={`/contratar/vagas/${job.id}`}
                        className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {filled}/{job.slots} confirmados
                      </Link>
                    </div>
                    <ul className="divide-y divide-line">
                      {pending
                        .filter((a) => a.jobId === job.id)
                        .map((a) => {
                          const f = freelancerOf(a.freelancerId);
                          return f ? (
                            <ApplicantRow
                              key={a.id}
                              app={a}
                              freelancer={f}
                              canDecide={filled < job.slots}
                            />
                          ) : null;
                        })}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </>
  );
}
