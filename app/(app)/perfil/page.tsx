"use client";

import { LogOut, Pencil, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ContratanteForm, FreelancerForm } from "@/components/profile-forms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StarRating } from "@/components/ui/stars";
import { averageStars, formatAddress } from "@/lib/core/logic";
import { ME } from "@/lib/core/mock";
import type { ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";

export default function PerfilPage() {
  const { state, dispatch, notify, resetDemo, backend } = useFreelas();
  const router = useRouter();
  const [editing, setEditing] = useState<ViewMode | null>(null);
  const user = state.user!;
  const f = user.freelancer;
  const c = user.contratante;

  const myApps = state.applications.filter((a) => a.freelancerId === ME);
  const received = myApps.flatMap((a) => (a.contractorReview ? [a.contractorReview.stars] : []));
  const done = myApps.filter((a) => a.status === "concluida");
  const attendance = done.length
    ? Math.round((done.filter((a) => a.checkInAt).length / done.length) * 100)
    : null;
  const freelancerPending = done.filter((a) => !a.freelancerReview).length;

  const myJobIds = new Set(state.jobs.filter((j) => j.contractorId === ME).map((j) => j.id));
  const establishmentApps = state.applications.filter(
    (a) => myJobIds.has(a.jobId) && a.status === "concluida",
  );
  const establishmentReceived = establishmentApps.flatMap((a) =>
    a.freelancerReview ? [a.freelancerReview.stars] : [],
  );
  const establishmentPending = establishmentApps.filter((a) => !a.contractorReview).length;

  // Opens the side's main page, which asks for the missing profile.
  function create(mode: ViewMode) {
    dispatch({ type: "set_mode", mode });
    router.push(mode === "freelancer" ? "/vagas" : "/contratar");
  }

  return (
    <>
      <PageHeader title="Perfil" description={user.email} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 sm:p-6" aria-labelledby="pf-free">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="pf-free" className="text-lg font-bold">
              Freelancer
            </h2>
          </div>
          {f ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar name={f.fullName} src={f.photoUrl} size={64} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{f.fullName}</p>
                  <StarRating value={averageStars(received)} count={received.length} />
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted">Presença</dt>
                  <dd className="font-semibold">
                    {attendance === null ? "Sem turnos ainda" : `${attendance}%`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Turnos concluídos</dt>
                  <dd className="font-semibold">{done.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Telefone</dt>
                  <dd>{f.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted">Chave Pix</dt>
                  <dd className="truncate">{f.pixKey}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Onde mora</dt>
                  {f.address ? (
                    <dd>{formatAddress(f.address)}</dd>
                  ) : (
                    <dd className="font-medium text-danger">
                      Não informado. Edite o perfil para se candidatar.
                    </dd>
                  )}
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {f.specialties.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
              {f.bio && <p className="mt-4 text-sm text-ink-soft">{f.bio}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <ReviewsLink href="/perfil/avaliacoes/pessoal" pending={freelancerPending} />
                <Button variant="outline" size="sm" onClick={() => setEditing("freelancer")}>
                  <Pencil className="size-4" aria-hidden />
                  Editar perfil
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-muted">
                Crie o perfil para se candidatar a turnos com o mesmo login.
              </p>
              <Button className="mt-4" variant="cta" onClick={() => create("freelancer")}>
                Criar perfil de freelancer
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 sm:p-6" aria-labelledby="pf-cont">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="pf-cont" className="text-lg font-bold">
              Contratante
            </h2>
          </div>
          {c ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar name={c.businessName} src={c.logoUrl} size={64} square />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{c.businessName}</p>
                  <StarRating
                    value={averageStars(establishmentReceived)}
                    count={establishmentReceived.length}
                  />
                  <p className="text-sm text-muted">Responsável: {c.manager}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <dt className="text-muted">CNPJ/CPF</dt>
                  <dd>{c.document}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">Endereço do estabelecimento</dt>
                  {typeof c.address === "object" ? (
                    <dd>{formatAddress(c.address)}</dd>
                  ) : (
                    <dd className="font-medium text-danger">
                      Informe pelo CEP. Edite o perfil para publicar vagas.
                    </dd>
                  )}
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <ReviewsLink
                  href="/perfil/avaliacoes/estabelecimento"
                  pending={establishmentPending}
                />
                <Button variant="outline" size="sm" onClick={() => setEditing("contratante")}>
                  <Pencil className="size-4" aria-hidden />
                  Editar perfil
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-muted">
                Crie o perfil para publicar vagas com o mesmo login.
              </p>
              <Button className="mt-4" variant="cta" onClick={() => create("contratante")}>
                Criar perfil de contratante
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {backend === "demo" && (
          <Button variant="ghost" onClick={resetDemo}>
            <RotateCcw className="size-4" aria-hidden />
            Restaurar dados de demonstração
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-danger"
          onClick={() => {
            dispatch({ type: "sign_out" });
            router.replace("/entrar");
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Sair
        </Button>
      </div>

      <Modal
        open={editing === "freelancer"}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar perfil de freelancer"
      >
        {f && (
          <FreelancerForm
            initial={f}
            submitLabel="Salvar alterações"
            onSubmit={(profile) => {
              dispatch({ type: "save_freelancer", profile });
              notify("Alterações salvas");
              setEditing(null);
            }}
          />
        )}
      </Modal>
      <Modal
        open={editing === "contratante"}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar perfil de contratante"
      >
        {c && (
          <ContratanteForm
            initial={c}
            submitLabel="Salvar alterações"
            onSubmit={(profile) => {
              dispatch({ type: "save_contratante", profile });
              notify("Alterações salvas");
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function ReviewsLink({ href, pending }: { href: string; pending: number }) {
  return (
    <Link href={href} className={buttonStyles({ variant: "primary", size: "sm" })}>
      <Star className="size-4" aria-hidden />
      Avaliações
      {pending > 0 && (
        <span className="rounded-full bg-cta px-1.5 text-xs font-bold text-navy-deep tabular-nums">
          {pending}
          <span className="sr-only"> para avaliar</span>
        </span>
      )}
    </Link>
  );
}
