"use client";

import { CheckCircle2, Loader2, LocateFixed, MapPinOff } from "lucide-react";
import { useState } from "react";
import { CHECKIN_RADIUS_METERS, distanceMeters, formatDistance } from "@/lib/core/logic";
import type { Application, Job } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { Button } from "./ui/button";

type Phase =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "far"; meters: number }
  | { kind: "error"; message: string };

/**
 * GPS check-in on the day of the shift. Compares the device position
 * with the job address; within CHECKIN_RADIUS_METERS the check-in is
 * recorded. Outside the radius, the demo offers a simulated arrival.
 */
export function CheckInPanel({ app, job }: { app: Application; job: Job }) {
  const { dispatch, notify, backend } = useFreelas();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  if (app.checkInAt) {
    const time = new Date(app.checkInAt).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <p className="flex items-center gap-2 rounded-xl bg-ok-wash px-3 py-2.5 text-sm font-medium text-ok-ink">
        <CheckCircle2 className="size-5 shrink-0" aria-hidden />
        Presença confirmada às {time}
      </p>
    );
  }

  function confirm(coords?: { lat: number; lng: number }) {
    dispatch({ type: "check_in", applicationId: app.id, now: new Date().toISOString(), coords });
    notify("Check-in feito. Bom turno!");
    setPhase({ kind: "idle" });
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setPhase({ kind: "error", message: "Este aparelho não informa a localização." });
      return;
    }
    setPhase({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const meters = distanceMeters({ lat: pos.coords.latitude, lng: pos.coords.longitude }, job);
        if (meters <= CHECKIN_RADIUS_METERS) {
          confirm({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else setPhase({ kind: "far", meters });
      },
      (err) =>
        setPhase({
          kind: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Permita o acesso à localização no navegador para fazer o check-in."
              : "Não foi possível obter sua localização. Tente de novo em área aberta.",
        }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ok/40 bg-ok-wash/60 p-3">
      <p className="text-sm text-ink-soft">
        Chegou ao local? Faça o check-in a até {CHECKIN_RADIUS_METERS} m do endereço.
      </p>
      <Button variant="success" block onClick={locate} disabled={phase.kind === "locating"}>
        {phase.kind === "locating" ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="size-5" aria-hidden />
        )}
        {phase.kind === "locating" ? "Verificando localização…" : "Fazer check-in GPS"}
      </Button>

      {(phase.kind === "far" || phase.kind === "error") && (
        <div role="alert" className="flex flex-col gap-2 pt-1">
          <p className="flex items-start gap-2 text-sm text-ink">
            <MapPinOff className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            {phase.kind === "far"
              ? `Você está a ${formatDistance(phase.meters)} do local. Chegue mais perto para confirmar.`
              : phase.message}
          </p>
          {/* Demo only: with Supabase the server checks the real position. */}
          {backend === "demo" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirm()}
              className="self-start underline underline-offset-4"
            >
              Simular chegada ao local (demo)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
