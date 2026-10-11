"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { JobTicket } from "@/components/job-ticket";
import { PageHeader } from "@/components/page-header";
import { RoleChooser } from "@/components/role-picker";
import { RequireProfile } from "@/components/require-profile";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  AddressFields,
  EMPTY_ADDRESS,
  toAddress,
  validateAddress,
  type AddressDraft,
  type AddressErrors,
} from "@/components/address-fields";
import { addDays, toISODate } from "@/lib/core/logic";
import { approximateCoords } from "@/lib/core/places";
import { ME } from "@/lib/core/mock";
import type { Job, Role } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";

export default function PublicarPage() {
  return (
    <RequireProfile mode="contratante">
      <PublishForm />
    </RequireProfile>
  );
}

interface Draft {
  role: Role;
  slots: number;
  date: string;
  start: string;
  end: string;
  pay: string;
  dressCode: string;
  notes: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

function PublishForm() {
  const { state, today, publishJob, contractorOf, notify } = useFreelas();
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => ({
    role: "Garçom / Cumim",
    slots: 2,
    date: toISODate(addDays(today, 1)),
    start: "18:00",
    end: "23:00",
    pay: "160",
    dressCode: "Calça e sapato pretos, camisa branca",
    notes: "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  // Starts from the establishment's address; each job can have its own.
  const [address, setAddress] = useState<AddressDraft>(() => {
    const a = state.user?.contratante?.address;
    return typeof a === "object" ? a : EMPTY_ADDRESS;
  });
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors = {};
    if (d.date < toISODate(today)) err.date = "Escolha hoje ou uma data futura.";
    if (!d.start || !d.end) err.start = "Informe início e término.";
    if (!(Number(d.pay) > 0)) err.pay = "Informe o valor da taxa.";
    if (!d.dressCode.trim()) err.dressCode = "Descreva o traje ou uniforme.";
    const addrErr = validateAddress(address);
    setErrors(err);
    setAddressErrors(addrErr);
    if (Object.keys(err).length > 0 || Object.keys(addrErr).length > 0) return;

    const location = toAddress(address);
    const id = publishJob({
      role: d.role,
      slots: d.slots,
      date: d.date,
      start: d.start,
      end: d.end,
      pay: Number(d.pay),
      ...location,
      ...approximateCoords(location),
      dressCode: d.dressCode.trim(),
      notes: d.notes.trim() || undefined,
    });
    notify("Vaga publicada");
    router.push(`/contratar/vagas/${id}`);
  }

  const preview: Job = {
    id: "preview",
    contractorId: ME,
    status: "aberta",
    createdAt: "",
    role: d.role,
    slots: d.slots,
    date: d.date || toISODate(today),
    start: d.start || "00:00",
    end: d.end || "00:00",
    pay: Number(d.pay) || 0,
    cep: address.cep ?? "",
    street: address.street ?? "",
    number: address.number ?? "",
    neighborhood: address.neighborhood || "Bairro",
    city: address.city || "Cidade",
    state: address.state ?? "",
    lat: 0,
    lng: 0,
    dressCode: d.dressCode,
  };

  return (
    <>
      <PageHeader
        title="Publicar vaga"
        description="Freelancers da região recebem a vaga assim que você publicar."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-6 rounded-2xl bg-card p-4 sm:p-6"
        >
          <RoleChooser label="Função" value={d.role} onChange={(r) => set("role", r)} />

          <div className="flex flex-col gap-1.5">
            <span id="slots-label" className="text-sm font-medium">
              Quantos profissionais?
            </span>
            <div
              role="group"
              aria-labelledby="slots-label"
              className="flex w-fit items-center rounded-xl border border-line"
            >
              <button
                type="button"
                aria-label="Diminuir"
                disabled={d.slots <= 1}
                onClick={() => set("slots", d.slots - 1)}
                className="grid size-11 place-items-center text-ink disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <output
                aria-live="polite"
                className="w-12 text-center font-display text-lg font-bold tabular-nums"
              >
                {d.slots}
              </output>
              <button
                type="button"
                aria-label="Aumentar"
                disabled={d.slots >= 50}
                onClick={() => set("slots", d.slots + 1)}
                className="grid size-11 place-items-center text-ink disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data" error={errors.date}>
              {(a) => (
                <Input
                  {...a}
                  type="date"
                  min={toISODate(today)}
                  value={d.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              )}
            </Field>
            <Field label="Início" error={errors.start}>
              {(a) => (
                <Input
                  {...a}
                  type="time"
                  value={d.start}
                  onChange={(e) => set("start", e.target.value)}
                />
              )}
            </Field>
            <Field label="Término" hint="Pode passar da meia-noite.">
              {(a) => (
                <Input
                  {...a}
                  type="time"
                  value={d.end}
                  onChange={(e) => set("end", e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field
            label="Valor da taxa (R$)"
            error={errors.pay}
            hint="Valor por profissional, pago via Pix."
          >
            {(a) => (
              <Input
                {...a}
                type="number"
                inputMode="numeric"
                min={1}
                step={10}
                value={d.pay}
                onChange={(e) => set("pay", e.target.value)}
                className="sm:max-w-48"
              />
            )}
          </Field>

          <AddressFields
            value={address}
            onChange={setAddress}
            errors={addressErrors}
            legend="Endereço da vaga"
            hint="Digite o CEP. A vaga aparece na busca pelo bairro e pela cidade."
          />

          <Field label="Traje ou uniforme" error={errors.dressCode}>
            {(a) => (
              <Input
                {...a}
                value={d.dressCode}
                onChange={(e) => set("dressCode", e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Observações"
            hint="Tipo de evento, número de convidados, refeição, estacionamento."
          >
            {(a) => (
              <Textarea {...a} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
            )}
          </Field>

          <Button type="submit" variant="cta" size="lg" block>
            Publicar vaga
          </Button>
        </form>

        <aside className="hidden lg:sticky lg:top-8 lg:block" aria-label="Prévia">
          <p className="mb-3 text-sm font-medium text-muted">Assim os freelancers veem sua vaga</p>
          <JobTicket
            job={preview}
            contractor={contractorOf(preview)}
            today={today}
            action={
              <Button variant="cta" tabIndex={-1} aria-hidden>
                Me candidatar
              </Button>
            }
          />
        </aside>
      </div>
    </>
  );
}
