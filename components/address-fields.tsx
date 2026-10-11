"use client";

import { Loader2, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { maskCEP, onlyDigits, samePlace } from "@/lib/core/logic";
import type { Address } from "@/lib/core/types";
import { lookupCep } from "@/lib/core/viacep";
import { Field, Input } from "./ui/field";

export type AddressDraft = Partial<Address>;
export type AddressErrors = Partial<Record<keyof Address, string>>;

export const EMPTY_ADDRESS: AddressDraft = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function validateAddress(a: AddressDraft): AddressErrors {
  const err: AddressErrors = {};
  if (onlyDigits(a.cep ?? "").length !== 8) err.cep = "Informe o CEP com 8 dígitos.";
  if (!a.street?.trim()) err.street = "Informe a rua.";
  if (!a.number?.trim()) err.number = "Informe o número. Use S/N se não houver.";
  if (!a.neighborhood?.trim()) err.neighborhood = "Informe o bairro.";
  if (!a.city?.trim()) err.city = "Informe a cidade.";
  if (!/^[A-Za-z]{2}$/.test(a.state ?? "")) err.state = "UF com 2 letras.";
  return err;
}

export function toAddress(a: AddressDraft): Address {
  return {
    cep: maskCEP(a.cep ?? ""),
    street: a.street!.trim(),
    number: a.number!.trim(),
    complement: a.complement?.trim() || undefined,
    neighborhood: a.neighborhood!.trim(),
    city: a.city!.trim(),
    state: a.state!.trim().toUpperCase(),
  };
}

type Lookup = "idle" | "loading" | "found" | "not_found" | "network";

const LOOKUP_ERROR: Partial<Record<Lookup, string>> = {
  not_found: "CEP não encontrado. Confira os números ou preencha o endereço abaixo.",
  network: "Não foi possível buscar o CEP agora. Preencha o endereço abaixo.",
};

/**
 * CEP-first address entry. Typing the 8th digit queries ViaCEP and fills
 * street, neighborhood, city and state; the user adds number and complement.
 */
export function AddressFields({
  value,
  onChange,
  errors,
  legend = "Onde você mora",
  hint = "O contratante vê só o bairro e a cidade, para saber de onde você sai.",
}: {
  value: AddressDraft;
  onChange: (a: AddressDraft) => void;
  errors: AddressErrors;
  legend?: string;
  hint?: string;
}) {
  const [lookup, setLookup] = useState<Lookup>(value.city ? "found" : "idle");
  const abort = useRef<AbortController | null>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const set = (patch: AddressDraft) => onChange({ ...value, ...patch });

  async function onCep(raw: string) {
    const cep = maskCEP(raw);
    set({ cep });
    abort.current?.abort();
    if (onlyDigits(cep).length !== 8) {
      setLookup("idle");
      return;
    }
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLookup("loading");
    try {
      const res = await lookupCep(cep, ctrl.signal);
      if (!res.ok) {
        setLookup(res.reason === "network" ? "network" : "not_found");
        return;
      }
      onChange({
        ...value,
        ...res.address,
        // A different street makes the old number meaningless.
        number: samePlace(res.address.street, value.street ?? "") ? value.number : "",
        complement: value.complement,
      });
      setLookup("found");
      numberRef.current?.focus();
    } catch {
      // Aborted by a newer lookup.
    }
  }

  const cepError = errors.cep ?? LOOKUP_ERROR[lookup];

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        <MapPin className="size-4 text-muted" aria-hidden />
        {legend}
      </legend>
      {hint && <p className="-mt-2 text-sm text-muted">{hint}</p>}

      <Field label="CEP" error={cepError} className="sm:max-w-56">
        {(a) => (
          <div className="relative">
            <Input
              {...a}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={value.cep ?? ""}
              onChange={(e) => onCep(e.target.value)}
            />
            {lookup === "loading" && (
              <Loader2
                className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted"
                aria-label="Buscando CEP"
              />
            )}
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Rua" error={errors.street}>
          {(a) => (
            <Input
              {...a}
              autoComplete="address-line1"
              value={value.street ?? ""}
              onChange={(e) => set({ street: e.target.value })}
            />
          )}
        </Field>
        <Field label="Número" error={errors.number}>
          {(a) => (
            <Input
              {...a}
              ref={numberRef}
              autoComplete="address-line2"
              value={value.number ?? ""}
              onChange={(e) => set({ number: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Complemento" hint="Opcional">
          {(a) => (
            <Input
              {...a}
              placeholder="Apto, bloco, casa"
              value={value.complement ?? ""}
              onChange={(e) => set({ complement: e.target.value })}
            />
          )}
        </Field>
        <Field label="Bairro" error={errors.neighborhood}>
          {(a) => (
            <Input
              {...a}
              value={value.neighborhood ?? ""}
              onChange={(e) => set({ neighborhood: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_88px] gap-4">
        <Field label="Cidade" error={errors.city}>
          {(a) => (
            <Input
              {...a}
              autoComplete="address-level2"
              value={value.city ?? ""}
              onChange={(e) => set({ city: e.target.value })}
            />
          )}
        </Field>
        <Field label="UF" error={errors.state}>
          {(a) => (
            <Input
              {...a}
              autoComplete="address-level1"
              maxLength={2}
              className="uppercase"
              value={value.state ?? ""}
              onChange={(e) => set({ state: e.target.value.toUpperCase() })}
            />
          )}
        </Field>
      </div>
    </fieldset>
  );
}
