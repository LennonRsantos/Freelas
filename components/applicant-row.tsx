"use client";

import { Check, CheckCircle2, Home, MapPinCheck, X } from "lucide-react";
import { FEATURES } from "@/lib/core/features";
import type { Application, FreelancerCard } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";
import { ApplicationBadge, Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { StarRating } from "./ui/stars";

interface ApplicantRowProps {
  app: Application;
  freelancer: FreelancerCard;
  /** When false, approve/reject is hidden (job full or closed). */
  canDecide: boolean;
  onRate?: () => void;
}

export function ApplicantRow({ app, freelancer, canDecide, onRate }: ApplicantRowProps) {
  const { dispatch, notify } = useFreelas();
  const first = freelancer.name.split(" ")[0];

  function decide(decision: "confirmada" | "recusada") {
    dispatch({ type: "decide", applicationId: app.id, decision });
    notify(
      decision === "confirmada" ? `${first} aprovado(a) para o turno` : `${first} recusado(a)`,
    );
  }

  const rate = freelancer.attendanceRate;
  const attendanceTone =
    rate === null
      ? "text-muted"
      : rate >= 95
        ? "text-ok-ink"
        : rate >= 85
          ? "text-ink"
          : "text-warn-ink";

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={freelancer.name} src={freelancer.photoUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{freelancer.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <StarRating value={freelancer.rating} count={freelancer.ratingCount} />
            <span className={cn("font-medium", attendanceTone)}>
              {rate === null ? "Primeiro turno" : `${rate}% de presença`}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{freelancer.specialties.join(", ")}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
            <Home className="size-3.5 shrink-0" aria-hidden />
            Sai de {freelancer.homeArea}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        {app.status === "em_analise" && canDecide ? (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => decide("recusada")}
              className="flex-1 sm:flex-none"
            >
              <X className="size-4" aria-hidden />
              Recusar
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => decide("confirmada")}
              className="flex-1 sm:flex-none"
            >
              <Check className="size-4" aria-hidden />
              Aprovar
            </Button>
          </>
        ) : app.status === "concluida" ? (
          app.contractorReview ? (
            <Badge tone="ok">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Avaliado com {app.contractorReview.stars} ★
            </Badge>
          ) : (
            <Button variant="cta" size="sm" onClick={onRate}>
              Avaliar
            </Button>
          )
        ) : (
          <>
            {FEATURES.checkIn && app.checkInAt && (
              <Badge tone="ok">
                <MapPinCheck className="size-3.5" aria-hidden />
                No local
              </Badge>
            )}
            <ApplicationBadge status={app.status} />
          </>
        )}
      </div>
    </li>
  );
}
