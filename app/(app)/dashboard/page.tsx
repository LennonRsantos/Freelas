"use client";

import { ArrowDownRight, ArrowUpRight, ChartColumn } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MonthlyColumns, RoleBars } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatHours, formatMoney } from "@/lib/core/logic";
import {
  contractorMetrics,
  formatMonthYear,
  freelancerMetrics,
  monthDelta,
  type Metrics,
} from "@/lib/core/metrics";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";

type Side = "profissional" | "empresa";

interface Tile {
  label: string;
  value: string;
  note?: string;
}

export default function DashboardPage() {
  const { state, today } = useFreelas();
  const user = state.user!;
  const sides: Side[] = [
    ...(user.freelancer ? (["profissional"] as const) : []),
    ...(user.contratante ? (["empresa"] as const) : []),
  ];
  const [side, setSide] = useState<Side>(sides[0] ?? "profissional");

  const metrics = useMemo(
    () =>
      side === "profissional"
        ? freelancerMetrics(state.jobs, state.applications, today)
        : contractorMetrics(state.jobs, state.applications, today),
    [side, state.jobs, state.applications, today],
  );

  if (sides.length === 0) {
    return (
      <EmptyState icon={ChartColumn} title="Sem dados ainda">
        Crie um perfil para acompanhar seus números.
      </EmptyState>
    );
  }

  const pro = side === "profissional";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          pro
            ? "Quanto você ganhou e como estão seus turnos."
            : `Quanto ${user.contratante?.businessName ?? "sua empresa"} investiu em equipe e como estão as vagas.`
        }
      />

      {sides.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Ver números como"
          className="mb-6 grid w-full grid-cols-2 rounded-xl bg-subtle p-1 sm:w-fit"
        >
          {sides.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => setSide(s)}
              className={cn(
                "h-9 rounded-lg px-5 text-sm font-semibold transition-colors",
                side === s ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {s === "profissional" ? "Como profissional" : "Como empresa"}
            </button>
          ))}
        </div>
      )}

      {metrics.count === 0 && metrics.upcomingCount === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title="Nenhum serviço finalizado ainda"
          action={
            <Link href={pro ? "/vagas" : "/publicar"} className={buttonStyles({ variant: "cta" })}>
              {pro ? "Procurar vagas" : "Publicar vaga"}
            </Link>
          }
        >
          {pro
            ? "Seus ganhos aparecem aqui depois do primeiro turno concluído."
            : "Os números aparecem aqui depois da primeira vaga encerrada."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <Hero metrics={metrics} pro={pro} />
          <Tiles tiles={pro ? freelancerTiles(metrics) : contractorTiles(metrics)} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <MonthlyColumns
              title={pro ? "Ganhos por mês" : "Investimento por mês"}
              data={metrics.byMonth}
              unit={pro ? ["turno", "turnos"] : ["profissional", "profissionais"]}
            />
            <RoleBars
              title={pro ? "Ganhos por função" : "Investimento por função"}
              data={metrics.byRole}
              unit={pro ? ["turno", "turnos"] : ["profissional", "profissionais"]}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Hero({ metrics, pro }: { metrics: Metrics; pro: boolean }) {
  const delta = monthDelta(metrics);
  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6" aria-label="Resumo">
      <p className="text-sm font-medium text-muted">
        {pro ? "Total ganho" : "Total pago à equipe"}
      </p>
      <p className="mt-1 text-5xl font-bold tracking-tight text-ink sm:text-6xl">
        {formatMoney(metrics.total)}
      </p>
      <p className="mt-2 text-sm text-muted">
        {pro
          ? `Em ${metrics.count} ${metrics.count === 1 ? "turno" : "turnos"}`
          : `Com ${metrics.count} ${metrics.count === 1 ? "profissional contratado" : "profissionais contratados"}`}
        {metrics.since && ` desde ${formatMonthYear(metrics.since)}`}.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 text-sm">
        <span className="text-muted">Este mês</span>
        <span className="font-semibold text-ink">{formatMoney(metrics.thisMonth)}</span>
        {delta !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              // More earnings is good; more spending is neutral information.
              pro ? (delta >= 0 ? "text-ok-ink" : "text-danger") : "text-muted",
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="size-4" aria-hidden />
            ) : (
              <ArrowDownRight className="size-4" aria-hidden />
            )}
            {delta >= 0 ? "+" : "−"}
            {Math.abs(delta)}% vs. mês passado
          </span>
        )}
      </div>
    </section>
  );
}

function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col gap-1 rounded-2xl bg-card p-4">
          <dt className="text-sm text-muted">{t.label}</dt>
          <dd className="text-2xl font-semibold text-ink">{t.value}</dd>
          {t.note && <dd className="text-xs text-muted">{t.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

const pct = (n: number | null) => (n === null ? "Sem dados" : `${n}%`);
const stars = (m: Metrics) =>
  m.ratingCount
    ? `${m.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ★`
    : "Sem notas";

function freelancerTiles(m: Metrics): Tile[] {
  return [
    { label: "Turnos trabalhados", value: String(m.count) },
    { label: "Horas trabalhadas", value: formatHours(Math.round(m.hours)) },
    { label: "Média por turno", value: formatMoney(m.average) },
    {
      label: "A receber",
      value: formatMoney(m.upcomingValue),
      note: `${m.upcomingCount} ${m.upcomingCount === 1 ? "turno confirmado" : "turnos confirmados"}`,
    },
    {
      label: "Nota média",
      value: stars(m),
      note: m.ratingCount ? `${m.ratingCount} avaliações` : undefined,
    },
    {
      label: "Presença",
      value: pct(m.rate),
      note: `${m.cancelled} ${m.cancelled === 1 ? "cancelamento" : "cancelamentos"}`,
    },
  ];
}

function contractorTiles(m: Metrics): Tile[] {
  return [
    { label: "Vagas oferecidas", value: String(m.offered) },
    { label: "Profissionais contratados", value: String(m.count) },
    { label: "Custo médio por profissional", value: formatMoney(m.average) },
    {
      label: "Próximas vagas",
      value: String(m.upcomingCount),
      note: `Até ${formatMoney(m.upcomingValue)} previstos`,
    },
    {
      label: "Nota do estabelecimento",
      value: stars(m),
      note: m.ratingCount ? `${m.ratingCount} avaliações` : undefined,
    },
    {
      label: "Vagas preenchidas",
      value: pct(m.rate),
      note: `${m.cancelled} ${m.cancelled === 1 ? "vaga cancelada" : "vagas canceladas"}`,
    },
  ];
}
