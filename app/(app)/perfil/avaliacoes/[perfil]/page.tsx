"use client";

import { ArrowLeft, Inbox, MessageSquareQuote, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RatingModal } from "@/components/rating-modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRow } from "@/components/ui/stars";
import { Tabs } from "@/components/ui/tabs";
import { averageStars, formatDateParts } from "@/lib/core/logic";
import { ME } from "@/lib/core/ids";
import type { Application, Job, Review, ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";

/** URL segment → who is being rated. */
const PROFILES = {
  pessoal: "freelancer",
  estabelecimento: "contratante",
} as const satisfies Record<string, ViewMode>;

type ProfileSlug = keyof typeof PROFILES;

interface Counterpart {
  name: string;
  photoUrl?: string;
  /** Logos are square, people are round. */
  square: boolean;
}

interface Row {
  app: Application;
  job: Job;
  other: Counterpart;
}

export default function ReviewsPage() {
  const { perfil } = useParams<{ perfil: string }>();
  const { state } = useFreelas();
  const slug = (perfil in PROFILES ? perfil : "pessoal") as ProfileSlug;
  const mode = PROFILES[slug];
  const hasProfile = mode === "freelancer" ? state.user?.freelancer : state.user?.contratante;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/perfil"
        className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Perfil
      </Link>
      {hasProfile ? (
        <Reviews mode={mode} />
      ) : (
        <EmptyState
          icon={MessageSquareQuote}
          title={
            mode === "freelancer"
              ? "Você ainda não tem perfil de freelancer"
              : "Você ainda não tem perfil de contratante"
          }
          action={
            <Link href="/perfil" className={buttonStyles({ variant: "outline" })}>
              Voltar ao perfil
            </Link>
          }
        >
          Crie o perfil para receber e fazer avaliações.
        </EmptyState>
      )}
    </div>
  );
}

function Reviews({ mode }: { mode: ViewMode }) {
  const { state, contractorOf, freelancerOf } = useFreelas();
  const [rating, setRating] = useState<Row | null>(null);
  const isFreelancer = mode === "freelancer";

  // Finished shifts where the user took part on this side.
  const rows: Row[] = state.applications
    .filter((a) => a.status === "concluida")
    .flatMap((app) => {
      const job = state.jobs.find((j) => j.id === app.jobId);
      if (!job) return [];
      if (isFreelancer && app.freelancerId === ME) {
        const c = contractorOf(job);
        return [{ app, job, other: { name: c.name, photoUrl: c.logoUrl, square: true } }];
      }
      if (!isFreelancer && job.contractorId === ME) {
        const f = freelancerOf(app.freelancerId);
        if (!f) return [];
        return [{ app, job, other: { name: f.name, photoUrl: f.photoUrl, square: false } }];
      }
      return [];
    })
    .sort((a, b) => b.job.date.localeCompare(a.job.date));

  // Reviews the user received and gave, from this profile's side.
  const receivedOf = (a: Application) => (isFreelancer ? a.contractorReview : a.freelancerReview);
  const givenOf = (a: Application) => (isFreelancer ? a.freelancerReview : a.contractorReview);

  const received = rows.filter((r) => receivedOf(r.app));
  const given = rows.filter((r) => givenOf(r.app));
  const pending = rows.filter((r) => !givenOf(r.app));

  const title = isFreelancer
    ? state.user?.freelancer?.fullName
    : state.user?.contratante?.businessName;

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Avaliações</h1>
        <p className="mt-1 text-muted">
          {isFreelancer ? `Perfil pessoal de ${title}` : `Estabelecimento ${title}`}
        </p>
      </div>

      <Summary reviews={received.map((r) => receivedOf(r.app)!)} isFreelancer={isFreelancer} />

      <Tabs
        defaultValue={pending.length > 0 ? "pendentes" : "recebidas"}
        tabs={[
          {
            value: "pendentes",
            label: "Para avaliar",
            count: pending.length,
            content:
              pending.length === 0 ? (
                <EmptyState icon={Inbox} title="Nenhuma avaliação pendente">
                  {isFreelancer
                    ? "Quando um turno for finalizado, avalie o contratante aqui."
                    : "Quando você finalizar um turno, avalie a equipe aqui."}
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-3">
                  {pending.map((r) => (
                    <li
                      key={r.app.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4"
                    >
                      <Who row={r} />
                      <Button variant="cta" size="sm" onClick={() => setRating(r)}>
                        <Star className="size-4" aria-hidden />
                        Avaliar
                      </Button>
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            value: "recebidas",
            label: "Recebidas",
            count: received.length,
            content: (
              <ReviewList
                rows={received}
                pick={receivedOf}
                empty={
                  isFreelancer
                    ? "Os contratantes avaliam você depois de cada turno concluído."
                    : "Os freelancers avaliam o estabelecimento depois de cada turno concluído."
                }
              />
            ),
          },
          {
            value: "feitas",
            label: "Feitas por você",
            count: given.length,
            content: (
              <ReviewList
                rows={given}
                pick={givenOf}
                empty="As avaliações que você enviar aparecem aqui."
              />
            ),
          },
        ]}
      />

      {rating && (
        <RatingModal
          open
          onOpenChange={(o) => !o && setRating(null)}
          applicationId={rating.app.id}
          by={mode}
          targetName={rating.other.name}
          subtitle={`${rating.job.role}, turno das ${rating.job.start} às ${rating.job.end}`}
        />
      )}
    </>
  );
}

function Summary({ reviews, isFreelancer }: { reviews: Review[]; isFreelancer: boolean }) {
  const avg = averageStars(reviews.map((r) => r.stars));
  const byStars = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: reviews.filter((r) => r.stars === n).length,
  }));
  const tagCounts = Object.entries(
    reviews
      .flatMap((r) => r.tags)
      .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);

  if (reviews.length === 0) {
    return (
      <section className="rounded-2xl bg-card p-5 text-sm text-muted sm:p-6">
        {isFreelancer
          ? "Você ainda não recebeu avaliações. Conclua turnos para formar sua nota."
          : "O estabelecimento ainda não recebeu avaliações dos freelancers."}
      </section>
    );
  }

  return (
    <section
      aria-label="Resumo das avaliações recebidas"
      className="grid gap-6 rounded-2xl bg-card p-5 sm:p-6 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-10"
    >
      <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-1">
        <p className="font-display text-5xl font-extrabold tabular-nums">
          {avg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
        </p>
        <div>
          <StarRow value={avg} />
          <p className="mt-1 text-sm text-muted">
            {reviews.length} {reviews.length === 1 ? "avaliação recebida" : "avaliações recebidas"}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5" aria-label="Distribuição das notas">
        {byStars.map(({ n, count }) => (
          <li key={n} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-right tabular-nums text-ink-soft">{n}</span>
            <Star className="size-3.5 fill-warn text-warn" aria-hidden />
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
              <span
                className="block h-full rounded-full bg-warn"
                style={{ width: `${(count / reviews.length) * 100}%` }}
              />
            </span>
            <span className="w-5 tabular-nums text-muted">{count}</span>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-2 text-sm font-medium">Mais citados</p>
        {tagCounts.length === 0 ? (
          <p className="text-sm text-muted">Nenhum destaque marcado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tagCounts.slice(0, 6).map(([tag, count]) => (
              <Badge key={tag} tone="ok">
                {tag} <span className="font-normal">×{count}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Who({ row }: { row: Row }) {
  const { weekday, day, month } = formatDateParts(row.job.date);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={row.other.name} src={row.other.photoUrl} square={row.other.square} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{row.other.name}</p>
        <p className="truncate text-sm text-muted">
          {row.job.role}, {weekday} {day} {month}
        </p>
      </div>
    </div>
  );
}

function ReviewList({
  rows,
  pick,
  empty,
}: {
  rows: Row[];
  pick: (a: Application) => Review | undefined;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={MessageSquareQuote} title="Nenhuma avaliação ainda">
        {empty}
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {rows.map((r) => {
        const review = pick(r.app)!;
        return (
          <li key={r.app.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
            <div className="flex items-start gap-3">
              <Who row={r} />
              <StarRow value={review.stars} className="mt-1 shrink-0" />
            </div>
            {review.comment && (
              <blockquote className="border-l-2 border-cta pl-3 text-[15px] text-ink-soft">
                “{review.comment}”
              </blockquote>
            )}
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {review.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
