import { Clock, MapPin, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
  formatDateParts,
  formatHours,
  formatMoney,
  relativeDayLabel,
  shiftHours,
} from "@/lib/core/logic";
import type { Contractor, Job } from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { StarRating } from "./ui/stars";

interface JobTicketProps {
  job: Job;
  contractor: Contractor;
  today: Date;
  /** Status badges shown next to the role. */
  meta?: ReactNode;
  /** Action area, bottom right (button, status…). */
  action?: ReactNode;
  /** Extra content below the main row (check-in, notes…). */
  children?: ReactNode;
  className?: string;
}

/**
 * A job rendered as a shift ticket ("comanda"): a navy stub with the
 * date and start time, a perforated edge, and the job details.
 */
export function JobTicket({
  job,
  contractor,
  today,
  meta,
  action,
  children,
  className,
}: JobTicketProps) {
  const { weekday, day, month } = formatDateParts(job.date);
  const rel = relativeDayLabel(job.date, today);
  const hours = shiftHours(job.start, job.end);

  // The mask that cuts the notches also clips box-shadow,
  // so the shadow lives on a wrapper as a drop-shadow filter.
  return (
    <div className={cn("drop-shadow-[0_2px_6px_rgb(15_23_42/0.08)]", className)}>
      <article className="ticket grid h-full grid-cols-[84px_1fr] overflow-hidden rounded-2xl bg-card [--stub:84px] sm:grid-cols-[100px_1fr] sm:[--stub:100px]">
        <div className="relative flex flex-col items-center justify-between bg-navy px-2 py-4 text-white">
          <div className="flex flex-col items-center leading-none">
            <span className="text-xs font-medium text-slate-300">{weekday}</span>
            <span className="mt-1 font-display text-[34px] font-extrabold tracking-tight">
              {day}
            </span>
            <span className="text-xs font-medium text-slate-300">{month}</span>
          </div>
          {rel && (
            <span className="my-2 rounded-full bg-cta px-2 py-0.5 text-[11px] font-bold text-navy-deep">
              {rel}
            </span>
          )}
          <div className="flex flex-col items-center leading-tight">
            <span className="font-display text-lg font-bold tabular-nums">{job.start}</span>
            <span className="text-[11px] text-slate-300">até {job.end}</span>
          </div>
          {/* perforation */}
          <span
            aria-hidden
            className="absolute inset-y-3 -right-px w-0 border-r-2 border-dashed border-canvas"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg leading-tight font-bold">{job.role}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="truncate font-medium text-ink-soft">{contractor.name}</span>
                <StarRating value={contractor.rating} count={contractor.ratingCount} />
              </p>
            </div>
            {meta}
          </div>

          <ul className="flex flex-col gap-1 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="truncate">
                {job.neighborhood}, {job.city}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted" aria-hidden />
              <span>{formatHours(hours)} de turno</span>
              <Users className="ml-2 size-4 shrink-0 text-muted" aria-hidden />
              <span>
                {job.slots} {job.slots === 1 ? "vaga" : "vagas"}
              </span>
            </li>
          </ul>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-line pt-3">
            <p className="leading-none">
              <span className="font-display text-2xl font-extrabold text-ok-ink tabular-nums">
                {formatMoney(job.pay)}
              </span>
              <span className="ml-1 text-sm text-muted">/taxa</span>
            </p>
            {action}
          </div>

          {children}
        </div>
      </article>
    </div>
  );
}
