"use client";

import { CalendarDays, MapPin, Shirt, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import {
  formatAddress,
  formatHours,
  formatMoney,
  parseISODate,
  shiftHours,
} from "@/lib/core/logic";
import type { Contractor, Job } from "@/lib/core/types";
import { Modal } from "./ui/modal";

export function JobDetailsModal({
  job,
  contractor,
  open,
  onOpenChange,
  footer,
}: {
  job: Job;
  contractor: Contractor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  footer?: ReactNode;
}) {
  const date = parseISODate(job.date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const rows = [
    {
      icon: CalendarDays,
      label: "Quando",
      value: `${date}, das ${job.start} às ${job.end} (${formatHours(shiftHours(job.start, job.end))})`,
    },
    { icon: MapPin, label: "Onde", value: formatAddress(job) },
    { icon: Shirt, label: "Traje", value: job.dressCode },
    ...(job.notes ? [{ icon: StickyNote, label: "Observações", value: job.notes }] : []),
  ];

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={job.role} description={contractor.name}>
      <div className="flex flex-col gap-5">
        <p className="font-display text-3xl font-extrabold text-ok-ink">
          {formatMoney(job.pay)}
          <span className="ml-1 font-sans text-base font-normal text-muted">de taxa</span>
        </p>
        <dl className="flex flex-col gap-4">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              <div>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="first-letter:uppercase">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {footer}
      </div>
    </Modal>
  );
}
