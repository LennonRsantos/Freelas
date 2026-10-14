"use client";

import { AlarmClock, CalendarDays, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { parseISODate } from "@/lib/core/logic";
import type { Job } from "@/lib/core/types";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";

export interface Consequence {
  icon: LucideIcon;
  text: string;
}

/** Hours left until the shift starts (negative once it started). */
function hoursUntil(job: Job, now: Date): number {
  const start = parseISODate(job.date);
  const [h, m] = job.start.split(":").map(Number);
  start.setHours(h, m, 0, 0);
  return (start.getTime() - now.getTime()) / 3_600_000;
}

/**
 * Confirmation for calling off a shift or a hire. Spells out what happens and,
 * when someone is affected, that it weighs on the user's reputation (the user
 * must tick that they understood). With nobody affected it just reassures.
 */
export function CancelDialog({
  open,
  onOpenChange,
  title,
  job,
  who,
  consequences,
  reputation,
  reputationRisk = true,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  job: Job;
  /** Second line of the summary card, e.g. the person or business involved. */
  who?: string;
  consequences: Consequence[];
  /** How this shows up on the user's reputation (or why it doesn't). */
  reputation: string;
  /** False when nobody is affected, so the cancellation leaves no mark. */
  reputationRisk?: boolean;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [understood, setUnderstood] = useState(false);
  const [now] = useState(() => new Date());
  const left = hoursUntil(job, now);
  // Last-minute only matters when someone was counting on the shift.
  const lastMinute = reputationRisk && left >= 0 && left < 24;
  const date = parseISODate(job.date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function close(next: boolean) {
    if (!next) setUnderstood(false);
    onOpenChange(next);
  }

  return (
    <Modal open={open} onOpenChange={close} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-ink">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{job.role}</p>
            <p className="text-sm text-muted first-letter:uppercase">
              {date}, das {job.start} às {job.end}
            </p>
            {who && <p className="truncate text-sm text-muted">{who}</p>}
          </div>
        </div>

        {lastMinute && (
          <p className="flex items-start gap-2.5 rounded-xl bg-warn-wash px-3.5 py-3 text-sm text-warn-ink">
            <AlarmClock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">Falta menos de 1 dia para o turno.</strong> Em cima
              da hora, fica difícil para a outra parte se reorganizar.
            </span>
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            O que acontece
          </p>
          <ul className="flex flex-col gap-2.5">
            {consequences.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-ink-soft">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {reputationRisk ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-wash p-4">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              Sua reputação pode cair
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">{reputation}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 size-[18px] shrink-0 accent-cta"
              />
              Entendi que este cancelamento fica no meu histórico.
            </label>
          </div>
        ) : (
          <div className="rounded-2xl border border-ok/30 bg-ok-wash p-4">
            <p className="flex items-center gap-2 font-semibold text-ok-ink">
              <ShieldCheck className="size-5 shrink-0" aria-hidden />
              Sua reputação não é afetada
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">{reputation}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => close(false)}>
            Manter
          </Button>
          <Button
            variant="danger"
            disabled={reputationRisk && !understood}
            onClick={() => {
              onConfirm();
              close(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
