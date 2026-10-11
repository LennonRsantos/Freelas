"use client";

import { Table2, ChartColumn } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/core/logic";
import type { MonthPoint, RolePoint } from "@/lib/core/metrics";
import { cn } from "@/lib/utils";

/** Round the axis top up to a clean number with even halves (1.2k, 1.6k, 2k…). */
function niceMax(max: number): number {
  if (max <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10].find((m) => m * pow >= max)!;
  return step * pow;
}

function ChartCard({
  title,
  subtitle,
  table,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn("rounded-2xl bg-card p-4 sm:p-6", className)} aria-label={title}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-subtle hover:text-ink"
        >
          {asTable ? (
            <ChartColumn className="size-4" aria-hidden />
          ) : (
            <Table2 className="size-4" aria-hidden />
          )}
          {asTable ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {asTable ? table : children}
    </section>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-muted">
          {head.map((h, i) => (
            <th key={h} className={cn("py-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((r) => (
          <tr key={String(r[0])} className="border-b border-line last:border-0">
            {r.map((c, i) => (
              <td key={i} className={cn("py-2", i > 0 && "text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Monthly columns, single series. Labels only on the best month and the
 * current one; the tooltip and the table carry the rest.
 */
export function MonthlyColumns({
  title,
  data,
  unit,
}: {
  title: string;
  data: MonthPoint[];
  /** "turno"/"turnos" or "profissional"/"profissionais". */
  unit: [string, string];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(...data.map((d) => d.value)));
  const best = data.reduce((b, d, i) => (d.value > data[b]!.value ? i : b), 0);
  const last = data.length - 1;
  const count = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`;
  const empty = data.every((d) => d.value === 0);

  return (
    <ChartCard
      title={title}
      subtitle="Últimos 6 meses"
      table={
        <DataTable
          head={["Mês", "Valor", "Quantidade"]}
          rows={data.map((d) => [d.label, formatMoney(d.value), d.count])}
        />
      }
    >
      {empty ? (
        <p className="py-12 text-center text-sm text-muted">
          Nenhum serviço finalizado nos últimos 6 meses.
        </p>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          {/* y axis */}
          <div className="relative h-48 text-right text-xs text-muted tabular-nums">
            {[1, 0.5, 0].map((f) => (
              <span
                key={f}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(1 - f) * 100}%` }}
              >
                {formatMoney(top * f)}
              </span>
            ))}
            <span className="invisible">{formatMoney(top)}</span>
          </div>

          {/* plot */}
          <div className="relative h-48" onMouseLeave={() => setHover(null)}>
            {[1, 0.5, 0].map((f) => (
              <div
                key={f}
                aria-hidden
                className="absolute inset-x-0 h-px bg-line"
                style={{ top: `${(1 - f) * 100}%` }}
              />
            ))}
            <ul className="absolute inset-0 flex">
              {data.map((d, i) => {
                const h = (d.value / top) * 100;
                const labeled = d.value > 0 && (i === best || i === last);
                return (
                  <li
                    key={d.key}
                    tabIndex={0}
                    aria-label={`${d.label}: ${formatMoney(d.value)}, ${count(d.count)}`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="relative flex flex-1 flex-col items-center justify-end rounded-md outline-offset-2"
                  >
                    {labeled && hover !== i && (
                      <span className="mb-1 text-xs font-semibold text-ink tabular-nums">
                        {formatMoney(d.value)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "w-full max-w-6 rounded-t bg-chart transition-opacity",
                        hover !== null && hover !== i && "opacity-40",
                      )}
                      style={{ height: `${h}%` }}
                    />
                    {hover === i && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute z-10 -translate-y-2 rounded-lg bg-inverse px-2.5 py-1.5 text-xs whitespace-nowrap text-on-inverse shadow-lg"
                        style={{ bottom: `${h}%` }}
                      >
                        <span className="block font-semibold tabular-nums">
                          {formatMoney(d.value)}
                        </span>
                        {d.label}, {count(d.count)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* x axis */}
          <span />
          <ul className="mt-2 flex text-xs text-muted" aria-hidden>
            {data.map((d, i) => (
              <li
                key={d.key}
                className={cn("flex-1 text-center", i === last && "font-semibold text-ink")}
              >
                {d.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

/** Horizontal bars by role, value at the tip. */
export function RoleBars({
  title,
  data,
  unit,
}: {
  title: string;
  data: RolePoint[];
  unit: [string, string];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const count = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`;
  return (
    <ChartCard
      title={title}
      subtitle="Desde o início"
      table={
        <DataTable
          head={["Função", "Valor", "Quantidade"]}
          rows={data.map((d) => [d.role, formatMoney(d.value), d.count])}
        />
      }
    >
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Nenhum serviço finalizado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((d) => (
            <li key={d.role} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{d.role}</span>
                <span className="text-muted tabular-nums">
                  <span className="font-semibold text-ink">{formatMoney(d.value)}</span>,{" "}
                  {count(d.count)}
                </span>
              </div>
              <span className="block h-2.5 w-full rounded-r bg-subtle" aria-hidden>
                <span
                  className="block h-full rounded-r bg-chart"
                  style={{ width: `${(d.value / max) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
