"use client";

import { Flag, UsersRound } from "lucide-react";
import { useState } from "react";
import { confirmedCount, toISODate } from "@/lib/core/logic";
import type { Application, Job } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { ApplicantRow } from "./applicant-row";
import { RatingModal } from "./rating-modal";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { Modal } from "./ui/modal";

const ORDER: Record<Application["status"], number> = {
  em_analise: 0,
  confirmada: 1,
  concluida: 2,
  recusada: 3,
  cancelada: 4,
};

/** Applicants of one job, with approve/reject, finish shift and ratings. */
export function JobApplicants({ job }: { job: Job }) {
  const { state, dispatch, today, freelancerOf, notify } = useFreelas();
  const [rateId, setRateId] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const apps = state.applications
    .filter((a) => a.jobId === job.id)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const filled = confirmedCount(job.id, state.applications);
  const canDecide = job.status !== "encerrada" && filled < job.slots;
  const canFinish = job.status !== "encerrada" && job.date <= toISODate(today) && filled > 0;
  const rating = apps.find((a) => a.id === rateId);
  const ratingPerson = rating && freelancerOf(rating.freelancerId);

  function finish() {
    dispatch({ type: "finish_shift", jobId: job.id });
    setConfirmFinish(false);
    notify("Turno finalizado. Avalie a equipe.");
  }

  return (
    <section aria-labelledby="applicants-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="applicants-title" className="text-xl font-bold">
            Candidatos
          </h2>
          <p className="text-sm text-muted">
            {filled} de {job.slots} {job.slots === 1 ? "vaga preenchida" : "vagas preenchidas"}
          </p>
        </div>
        {canFinish && (
          <Button variant="primary" onClick={() => setConfirmFinish(true)}>
            <Flag className="size-4" aria-hidden />
            Finalizar turno
          </Button>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
        <div
          className="h-full rounded-full bg-ok transition-[width]"
          style={{ width: `${Math.min(100, (filled / job.slots) * 100)}%` }}
        />
      </div>

      {apps.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={UsersRound} title="Aguardando candidatos">
            Os freelancers recebem a vaga agora. Novas candidaturas aparecem aqui na hora.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {apps.map((app) => {
            const f = freelancerOf(app.freelancerId);
            if (!f) return null;
            return (
              <ApplicantRow
                key={app.id}
                app={app}
                freelancer={f}
                canDecide={canDecide}
                onRate={() => setRateId(app.id)}
              />
            );
          })}
        </ul>
      )}

      <Modal
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Finalizar turno?"
        description="Os profissionais aprovados ficam como concluídos e candidaturas pendentes são encerradas. Depois disso você avalia a equipe."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmFinish(false)}>
            Cancelar
          </Button>
          <Button variant="cta" onClick={finish}>
            Finalizar turno
          </Button>
        </div>
      </Modal>

      {rating && ratingPerson && (
        <RatingModal
          open
          onOpenChange={(o) => !o && setRateId(null)}
          applicationId={rating.id}
          by="contratante"
          targetName={ratingPerson.name}
          subtitle={`${job.role}, turno das ${job.start} às ${job.end}`}
        />
      )}
    </section>
  );
}
