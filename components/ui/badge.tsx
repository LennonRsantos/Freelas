import type { ReactNode } from "react";
import type { ApplicationStatus, JobStatus } from "@/lib/core/types";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "ok" | "warn" | "danger" | "navy";

const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-soft",
  ok: "bg-ok-wash text-ok-ink",
  warn: "bg-warn-wash text-warn-ink",
  danger: "bg-danger-wash text-danger",
  navy: "bg-inverse text-on-inverse",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const APP_STATUS: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  em_analise: { label: "Em análise", tone: "warn" },
  confirmada: { label: "Confirmada", tone: "ok" },
  recusada: { label: "Não selecionada", tone: "neutral" },
  concluida: { label: "Concluída", tone: "navy" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  aberta: { label: "Recebendo candidatos", tone: "warn" },
  preenchida: { label: "Equipe completa", tone: "ok" },
  encerrada: { label: "Encerrada", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

export function ApplicationBadge({ status }: { status: ApplicationStatus }) {
  const s = APP_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const s = JOB_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
