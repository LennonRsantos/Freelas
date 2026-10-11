"use client";

import { Camera } from "lucide-react";
import { useState, type FormEvent } from "react";
import { maskCPF, maskDocument, maskPhone, onlyDigits } from "@/lib/core/logic";
import type { ContratanteProfile, FreelancerProfile } from "@/lib/core/types";
import {
  AddressFields,
  EMPTY_ADDRESS,
  toAddress,
  validateAddress,
  type AddressDraft,
  type AddressErrors,
} from "./address-fields";
import { RoleChooser } from "./role-picker";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Field, Input, Textarea } from "./ui/field";

/** Reads an image and downsizes it so it fits in local storage. */
async function readImage(file: File, max = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoPicker({
  name,
  value,
  onChange,
  square,
  label,
}: {
  name: string;
  value?: string;
  onChange: (v: string) => void;
  square?: boolean;
  label: string;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-4">
      <span className="relative">
        <Avatar name={name || "?"} src={value} size={72} square={square} />
        <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-card bg-navy text-white">
          <Camera className="size-3.5" aria-hidden />
        </span>
      </span>
      <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">
        {value ? `Trocar ${label}` : `Adicionar ${label}`}
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange(await readImage(file));
        }}
      />
    </label>
  );
}

type Errors<T> = Partial<Record<keyof T, string>>;

export const EMPTY_FREELANCER: FreelancerProfile = {
  fullName: "",
  phone: "",
  cpf: "",
  specialties: [],
  bio: "",
  pixKey: "",
};

export function FreelancerForm({
  initial = EMPTY_FREELANCER,
  submitLabel,
  onSubmit,
}: {
  initial?: FreelancerProfile;
  submitLabel: string;
  onSubmit: (p: FreelancerProfile) => void;
}) {
  const [p, setP] = useState(initial);
  const [errors, setErrors] = useState<Errors<FreelancerProfile>>({});
  const [address, setAddress] = useState<AddressDraft>(initial.address ?? EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const set = <K extends keyof FreelancerProfile>(k: K, v: FreelancerProfile[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors<FreelancerProfile> = {};
    if (p.fullName.trim().split(/\s+/).length < 2) err.fullName = "Informe nome e sobrenome.";
    if (onlyDigits(p.phone).length < 10) err.phone = "Informe o telefone com DDD.";
    if (onlyDigits(p.cpf).length !== 11) err.cpf = "O CPF tem 11 dígitos.";
    if (p.specialties.length === 0) err.specialties = "Escolha pelo menos uma função.";
    if (!p.pixKey.trim()) err.pixKey = "Informe a chave Pix para receber os pagamentos.";
    const addrErr = validateAddress(address);
    setErrors(err);
    setAddressErrors(addrErr);
    if (Object.keys(err).length === 0 && Object.keys(addrErr).length === 0) {
      onSubmit({ ...p, address: toAddress(address) });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <PhotoPicker
        name={p.fullName}
        value={p.photoUrl}
        onChange={(v) => set("photoUrl", v)}
        label="foto"
      />
      <Field label="Nome completo" error={errors.fullName}>
        {(a) => (
          <Input
            {...a}
            autoComplete="name"
            value={p.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Telefone (WhatsApp)" error={errors.phone}>
          {(a) => (
            <Input
              {...a}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              value={p.phone}
              onChange={(e) => set("phone", maskPhone(e.target.value))}
            />
          )}
        </Field>
        <Field label="CPF" error={errors.cpf}>
          {(a) => (
            <Input
              {...a}
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={p.cpf}
              onChange={(e) => set("cpf", maskCPF(e.target.value))}
            />
          )}
        </Field>
      </div>
      <AddressFields value={address} onChange={setAddress} errors={addressErrors} />
      <div className="flex flex-col gap-2">
        <RoleChooser
          multiple
          label="Funções em que você trabalha"
          value={p.specialties}
          onChange={(r) => set("specialties", r)}
        />
        {errors.specialties && <p className="text-sm text-danger">{errors.specialties}</p>}
      </div>
      <Field
        label="Sobre você"
        hint="Experiência, eventos que já fez, idiomas. Até 240 caracteres."
      >
        {(a) => (
          <Textarea
            {...a}
            maxLength={240}
            placeholder="Garçom há 4 anos, experiência em casamentos e serviço à francesa."
            value={p.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        )}
      </Field>
      <Field label="Chave Pix" hint="Os contratantes pagam a taxa por Pix." error={errors.pixKey}>
        {(a) => (
          <Input
            {...a}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={p.pixKey}
            onChange={(e) => set("pixKey", e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" variant="cta" size="lg" block>
        {submitLabel}
      </Button>
    </form>
  );
}

export const EMPTY_CONTRATANTE: ContratanteProfile = {
  businessName: "",
  document: "",
  manager: "",
  address: "",
};

export function ContratanteForm({
  initial = EMPTY_CONTRATANTE,
  submitLabel,
  onSubmit,
}: {
  initial?: ContratanteProfile;
  submitLabel: string;
  onSubmit: (p: ContratanteProfile) => void;
}) {
  const [p, setP] = useState(initial);
  const [errors, setErrors] = useState<Errors<ContratanteProfile>>({});
  // Older profiles stored the address as free text: start the CEP lookup empty.
  const [address, setAddress] = useState<AddressDraft>(
    typeof initial.address === "object" ? initial.address : EMPTY_ADDRESS,
  );
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const set = <K extends keyof ContratanteProfile>(k: K, v: ContratanteProfile[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors<ContratanteProfile> = {};
    if (!p.businessName.trim()) err.businessName = "Informe o nome do estabelecimento ou evento.";
    const doc = onlyDigits(p.document).length;
    if (doc !== 11 && doc !== 14)
      err.document = "Informe um CNPJ (14 dígitos) ou CPF (11 dígitos).";
    if (!p.manager.trim()) err.manager = "Informe quem recebe a equipe no dia.";
    const addrErr = validateAddress(address);
    setErrors(err);
    setAddressErrors(addrErr);
    if (Object.keys(err).length === 0 && Object.keys(addrErr).length === 0) {
      onSubmit({ ...p, address: toAddress(address) });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <PhotoPicker
        name={p.businessName}
        value={p.logoUrl}
        onChange={(v) => set("logoUrl", v)}
        square
        label="logo"
      />
      <Field label="Nome do estabelecimento ou evento" error={errors.businessName}>
        {(a) => (
          <Input
            {...a}
            autoComplete="organization"
            placeholder="Bistrô Lamparina"
            value={p.businessName}
            onChange={(e) => set("businessName", e.target.value)}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="CNPJ ou CPF" error={errors.document}>
          {(a) => (
            <Input
              {...a}
              inputMode="numeric"
              value={p.document}
              onChange={(e) => set("document", maskDocument(e.target.value))}
            />
          )}
        </Field>
        <Field label="Responsável" error={errors.manager}>
          {(a) => (
            <Input
              {...a}
              autoComplete="name"
              value={p.manager}
              onChange={(e) => set("manager", e.target.value)}
            />
          )}
        </Field>
      </div>
      <AddressFields
        value={address}
        onChange={setAddress}
        errors={addressErrors}
        legend="Endereço do estabelecimento"
        hint="Sugerido ao publicar vagas. Você pode trocar em cada vaga."
      />
      <Button type="submit" variant="cta" size="lg" block>
        {submitLabel}
      </Button>
    </form>
  );
}
