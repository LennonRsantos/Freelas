"use client";

import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { JobApplicants } from "@/components/job-applicants";
import { JobTicket } from "@/components/job-ticket";
import { RequireProfile } from "@/components/require-profile";
import { JobStatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAddress } from "@/lib/core/logic";
import { ME } from "@/lib/core/ids";
import { useFreelas } from "@/lib/store/freelas-store";

export default function JobDetailPage() {
  return (
    <RequireProfile mode="contratante">
      <JobDetail />
    </RequireProfile>
  );
}

function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, today, contractorOf } = useFreelas();
  const job = state.jobs.find((j) => j.id === id && j.contractorId === ME);

  if (!job) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Vaga não encontrada"
        action={
          <Link href="/servicos" className={buttonStyles({ variant: "outline" })}>
            Ver serviços
          </Link>
        }
      >
        Ela pode ter sido removida ou pertence a outro contratante.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/servicos"
        className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Serviços
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-8">
          <JobTicket
            job={job}
            contractor={contractorOf(job)}
            today={today}
            meta={<JobStatusBadge status={job.status} />}
          />
          <div className="rounded-2xl bg-card p-4 text-sm text-ink-soft">
            <p>
              <span className="font-medium text-ink">Endereço: </span>
              {formatAddress(job)}
            </p>
            <p className="mt-1">
              <span className="font-medium text-ink">Traje: </span>
              {job.dressCode}
            </p>
            {job.notes && <p className="mt-1">{job.notes}</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4 sm:p-6">
          <JobApplicants job={job} />
        </div>
      </div>
    </div>
  );
}
