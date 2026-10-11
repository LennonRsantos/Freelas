"use client";

import { useEffect, type ReactNode } from "react";
import { isContratanteProfileComplete, isFreelancerProfileComplete } from "@/lib/core/logic";
import type { ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { ContratanteForm, FreelancerForm } from "./profile-forms";

const COPY = {
  freelancer: {
    create: "Crie seu perfil de freelancer",
    createText: "Com ele você se candidata às vagas e recebe por Pix. Usa o mesmo login.",
    update: "Informe onde você mora",
    updateText: "O endereço agora é obrigatório. O contratante vê só o bairro e a cidade.",
  },
  contratante: {
    create: "Crie seu perfil de contratante",
    createText: "Com ele você publica vagas e aprova candidatos. Usa o mesmo login.",
    update: "Informe o endereço do estabelecimento",
    updateText:
      "Agora o endereço é buscado pelo CEP, para as vagas aparecerem na busca por região.",
  },
} satisfies Record<ViewMode, Record<string, string>>;

/**
 * Renders children only when the user has a complete profile for the
 * current mode. Otherwise asks for it inline, without leaving the page.
 */
export function RequireProfile({ mode, children }: { mode: ViewMode; children: ReactNode }) {
  const { state, dispatch, notify } = useFreelas();
  const user = state.user;

  // Opening a page of the other mode (deep link, "Criar") switches the view.
  useEffect(() => {
    if (state.mode !== mode) dispatch({ type: "set_mode", mode });
  }, [mode, state.mode, dispatch]);

  if (!user) return null;
  const ready =
    mode === "freelancer"
      ? isFreelancerProfileComplete(user.freelancer)
      : isContratanteProfileComplete(user.contratante);
  if (ready) return <>{children}</>;

  // A profile saved before its address was looked up by CEP.
  const updating = Boolean(mode === "freelancer" ? user.freelancer : user.contratante);
  const copy = COPY[mode];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold">{updating ? copy.update : copy.create}</h1>
      <p className="mt-1 mb-6 text-muted">{updating ? copy.updateText : copy.createText}</p>
      <div className="rounded-2xl bg-card p-5 shadow-sm sm:p-6">
        {mode === "freelancer" ? (
          <FreelancerForm
            initial={user.freelancer}
            submitLabel={updating ? "Salvar e continuar" : "Criar perfil de freelancer"}
            onSubmit={(profile) => {
              dispatch({ type: "save_freelancer", profile });
              notify(updating ? "Endereço salvo" : "Perfil de freelancer criado");
            }}
          />
        ) : (
          <ContratanteForm
            initial={user.contratante}
            submitLabel={updating ? "Salvar e continuar" : "Criar perfil de contratante"}
            onSubmit={(profile) => {
              dispatch({ type: "save_contratante", profile });
              notify(updating ? "Endereço salvo" : "Perfil de contratante criado");
            }}
          />
        )}
      </div>
    </div>
  );
}
