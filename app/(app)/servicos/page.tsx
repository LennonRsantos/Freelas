"use client";

import { Ban, CalendarClock, CheckCircle2, ClipboardList, Star } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckInPanel } from "@/components/check-in-panel";
import { JobTicket } from "@/components/job-ticket";
import { PageHeader } from "@/components/page-header";
import { RatingModal } from "@/components/rating-modal";
import { ApplicationBadge, Badge, JobStatusBadge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRow } from "@/components/ui/stars";
import { averageStars, canCheckIn, parseISODate, toISODate } from "@/lib/core/logic";
import { FEATURES } from "@/lib/core/features";
import { ME } from "@/lib/core/mock";
import type { Application, Job, Review } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";

type Side = "prestados" | "oferecidos";
type Bucket = "proximos" | "finalizados" | "cancelados";

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "proximos", label: "Próximos" },
  { value: "finalizados", label: "Finalizados" },
  { value: "cancelados", label: "Cancelados" },
];

const byDateAsc = (a: Job, b: Job) => (a.date + a.start).localeCompare(b.date + b.start);
const byDateDesc = (a: Job, b: Job) => byDateAsc(b, a);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

export default function ServicosPage() {
  const { state } = useFreelas();
  const user = state.user!;
  const hasCompany = Boolean(user.contratante);
  const [side, setSide] = useState<Side>(
    user.freelancer || !hasCompany ? "prestados" : "oferecidos",
  );
  const [bucket, setBucket] = useState<Bucket>("proximos");

  return (
    <>
      <PageHeader
        title="Serviços"
        description="Turnos que você trabalhou e vagas que você ofereceu, com as avaliações."
      />

      {hasCompany && (
        <div
          role="radiogroup"
          aria-label="Tipo de serviço"
          className="mb-4 grid w-full grid-cols-2 rounded-xl bg-subtle p-1 sm:w-fit"
        >
          {(
            [
              ["prestados", "Prestados"],
              ["oferecidos", "Oferecidos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={side === value}
              onClick={() => setSide(value)}
              className={cn(
                "h-9 rounded-lg px-5 text-sm font-semibold transition-colors",
                side === value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {side === "prestados" ? (
        <Prestados bucket={bucket} setBucket={setBucket} />
      ) : (
        <Oferecidos bucket={bucket} setBucket={setBucket} />
      )}
    </>
  );
}

function BucketFilter({
  bucket,
  setBucket,
  counts,
}: {
  bucket: Bucket;
  setBucket: (b: Bucket) => void;
  counts: Record<Bucket, number>;
}) {
  return (
    <div role="group" aria-label="Filtrar serviços" className="mb-5 flex flex-wrap gap-2">
      {BUCKETS.map((b) => (
        <Chip key={b.value} selected={bucket === b.value} onClick={() => setBucket(b.value)}>
          {b.label}
          <span className="tabular-nums opacity-70">{counts[b.value]}</span>
        </Chip>
      ))}
    </div>
  );
}

function ReviewLine({ label, review }: { label: string; review: Review }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted">{label}</span>
        <StarRow value={review.stars} />
      </div>
      {review.comment && <p className="text-ink-soft">“{review.comment}”</p>}
    </div>
  );
}

const EMPTY: Record<Side, Record<Bucket, string>> = {
  prestados: {
    proximos: "Candidate-se a um turno em Procurar. Ele aparece aqui até o dia do serviço.",
    finalizados: "Turnos concluídos aparecem aqui, com as avaliações.",
    cancelados: "Nenhum turno cancelado. Ótimo para sua taxa de presença.",
  },
  oferecidos: {
    proximos: "Publique uma vaga em Oferecer. Ela aparece aqui até o dia do serviço.",
    finalizados: "Vagas encerradas aparecem aqui, com as avaliações da equipe.",
    cancelados: "Nenhuma vaga cancelada.",
  },
};

function List({ side, bucket, children }: { side: Side; bucket: Bucket; children: ReactNode[] }) {
  if (children.length === 0) {
    const icon =
      bucket === "proximos" ? CalendarClock : bucket === "finalizados" ? CheckCircle2 : Ban;
    return (
      <EmptyState
        icon={icon}
        title={`Nenhum serviço ${bucket === "proximos" ? "próximo" : bucket === "finalizados" ? "finalizado" : "cancelado"}`}
        action={
          bucket === "proximos" ? (
            <Link
              href={side === "prestados" ? "/vagas" : "/publicar"}
              className={buttonStyles({ variant: "cta" })}
            >
              {side === "prestados" ? "Procurar vagas" : "Publicar vaga"}
            </Link>
          ) : undefined
        }
      >
        {EMPTY[side][bucket]}
      </EmptyState>
    );
  }
  return <ul className="grid gap-4 lg:grid-cols-2">{children}</ul>;
}

/* ---------- Turnos que o usuário trabalhou ---------- */

function Prestados({ bucket, setBucket }: { bucket: Bucket; setBucket: (b: Bucket) => void }) {
  const { state, dispatch, today, contractorOf, notify } = useFreelas();
  const [rating, setRating] = useState<{ app: Application; job: Job } | null>(null);
  const [cancelling, setCancelling] = useState<Application | null>(null);

  if (!state.user?.freelancer) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Você ainda não trabalha como freelancer"
        action={
          <Link href="/vagas" className={buttonStyles({ variant: "cta" })}>
            Criar perfil de freelancer
          </Link>
        }
      >
        Crie o perfil para se candidatar a turnos com o mesmo login.
      </EmptyState>
    );
  }

  const rows = state.applications
    .filter((a) => a.freelancerId === ME)
    .flatMap((app) => {
      const job = state.jobs.find((j) => j.id === app.jobId);
      return job ? [{ app, job }] : [];
    });

  const groups: Record<Bucket, typeof rows> = {
    proximos: rows
      .filter((r) => r.app.status === "em_analise" || r.app.status === "confirmada")
      .sort((a, b) => byDateAsc(a.job, b.job)),
    finalizados: rows
      .filter((r) => r.app.status === "concluida")
      .sort((a, b) => byDateDesc(a.job, b.job)),
    cancelados: rows
      .filter((r) => r.app.status === "cancelada")
      .sort((a, b) => byDateDesc(a.job, b.job)),
  };
  const counts = {
    proximos: groups.proximos.length,
    finalizados: groups.finalizados.length,
    cancelados: groups.cancelados.length,
  };

  function details({ app, job }: (typeof rows)[number]) {
    if (bucket === "proximos") {
      if (FEATURES.checkIn && (canCheckIn(app, job, today) || app.checkInAt)) {
        return <CheckInPanel app={app} job={job} />;
      }
      if (app.status === "em_analise") {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted"
            onClick={() => {
              dispatch({ type: "withdraw", applicationId: app.id });
              notify("Candidatura retirada");
            }}
          >
            Retirar candidatura
          </Button>
        );
      }
      return (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-muted">
            <CalendarClock className="size-4" aria-hidden />
            {FEATURES.checkIn
              ? "Check-in liberado no dia do turno."
              : "Turno confirmado. Chegue no horário combinado."}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => setCancelling(app)}
          >
            Cancelar participação
          </Button>
        </div>
      );
    }
    if (bucket === "cancelados") {
      return (
        <p className="text-sm text-muted">
          {app.cancelledBy === "freelancer" ? "Cancelado por você" : "Cancelado pelo contratante"}
          {app.cancelledAt && ` em ${shortDate(app.cancelledAt)}`}.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-3 border-t border-dashed border-line pt-3">
        {app.contractorReview ? (
          <ReviewLine label="Nota do contratante" review={app.contractorReview} />
        ) : (
          <p className="text-sm text-muted">O contratante ainda não avaliou este turno.</p>
        )}
        {app.freelancerReview ? (
          <ReviewLine label="Sua avaliação" review={app.freelancerReview} />
        ) : (
          <Button
            variant="cta"
            size="sm"
            className="self-start"
            onClick={() => setRating({ app, job })}
          >
            <Star className="size-4" aria-hidden />
            Avaliar contratante
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <BucketFilter bucket={bucket} setBucket={setBucket} counts={counts} />
      <List side="prestados" bucket={bucket}>
        {groups[bucket].map((r) => (
          <li key={r.app.id}>
            <JobTicket
              job={r.job}
              contractor={contractorOf(r.job)}
              today={today}
              className="h-full"
              meta={<ApplicationBadge status={r.app.status} />}
            >
              {details(r)}
            </JobTicket>
          </li>
        ))}
      </List>

      {rating && (
        <RatingModal
          open
          onOpenChange={(o) => !o && setRating(null)}
          applicationId={rating.app.id}
          by="freelancer"
          targetName={contractorOf(rating.job).name}
          subtitle={`${rating.job.role}, ${rating.job.neighborhood}`}
        />
      )}
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancelar participação?"
        description="O contratante é avisado e a vaga volta a receber candidatos. Cancelamentos reduzem sua taxa de presença."
        confirmLabel="Cancelar participação"
        onConfirm={() => {
          if (!cancelling) return;
          dispatch({
            type: "cancel_application",
            applicationId: cancelling.id,
            now: new Date().toISOString(),
          });
          notify("Participação cancelada");
        }}
      />
    </>
  );
}

/* ---------- Vagas que a empresa do usuário ofereceu ---------- */

function Oferecidos({ bucket, setBucket }: { bucket: Bucket; setBucket: (b: Bucket) => void }) {
  const { state, dispatch, today, contractorOf, notify } = useFreelas();
  const [cancelling, setCancelling] = useState<Job | null>(null);
  const todayISO = toISODate(today);

  const mine = state.jobs.filter((j) => j.contractorId === ME);
  const groups: Record<Bucket, Job[]> = {
    proximos: mine
      .filter((j) => j.status === "aberta" || j.status === "preenchida")
      .sort(byDateAsc),
    finalizados: mine.filter((j) => j.status === "encerrada").sort(byDateDesc),
    cancelados: mine.filter((j) => j.status === "cancelada").sort(byDateDesc),
  };
  const counts = {
    proximos: groups.proximos.length,
    finalizados: groups.finalizados.length,
    cancelados: groups.cancelados.length,
  };
  const appsOf = (job: Job) => state.applications.filter((a) => a.jobId === job.id);

  function details(job: Job) {
    const apps = appsOf(job);
    if (bucket === "proximos") {
      const pending = apps.filter((a) => a.status === "em_analise").length;
      const confirmed = apps.filter((a) => a.status === "confirmada").length;
      return (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            {confirmed} de {job.slots} confirmados
            {pending > 0 && <span className="text-warn-ink">, {pending} aguardando resposta</span>}
          </p>
          {job.date >= todayISO && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => setCancelling(job)}
            >
              Cancelar vaga
            </Button>
          )}
        </div>
      );
    }
    if (bucket === "cancelados") {
      const affected = apps.filter((a) => a.status === "cancelada").length;
      return (
        <p className="text-sm text-muted">
          Cancelada por você.{" "}
          {affected > 0 &&
            `${affected} ${affected === 1 ? "profissional foi avisado" : "profissionais foram avisados"}.`}
        </p>
      );
    }
    const team = apps.filter((a) => a.status === "concluida");
    const received = team.flatMap((a) => (a.freelancerReview ? [a.freelancerReview.stars] : []));
    const toRate = team.filter((a) => !a.contractorReview).length;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted">
            {team.length} {team.length === 1 ? "profissional" : "profissionais"}
          </span>
          {received.length > 0 && (
            <>
              <StarRow value={averageStars(received)} />
              <span className="text-muted">da equipe</span>
            </>
          )}
        </div>
        {toRate > 0 ? (
          <Link
            href={`/contratar/vagas/${job.id}`}
            className={buttonStyles({ variant: "cta", size: "sm" })}
          >
            <Star className="size-4" aria-hidden />
            Avaliar equipe ({toRate})
          </Link>
        ) : (
          <Badge tone="ok">Equipe avaliada</Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <BucketFilter bucket={bucket} setBucket={setBucket} counts={counts} />
      <List side="oferecidos" bucket={bucket}>
        {groups[bucket].map((job) => (
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
                  {bucket === "proximos" ? "Ver candidatos" : "Ver equipe"}
                </Link>
              }
            >
              {details(job)}
            </JobTicket>
          </li>
        ))}
      </List>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancelar vaga?"
        description={
          cancelling
            ? `A vaga de ${cancelling.role} do dia ${parseISODate(cancelling.date).toLocaleDateString("pt-BR")} sai do ar e os candidatos são avisados.`
            : ""
        }
        confirmLabel="Cancelar vaga"
        onConfirm={() => {
          if (!cancelling) return;
          dispatch({ type: "cancel_job", jobId: cancelling.id, now: new Date().toISOString() });
          notify("Vaga cancelada");
        }}
      />
    </>
  );
}
