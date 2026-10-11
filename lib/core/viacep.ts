// ViaCEP lookup (https://viacep.com.br). Uses only fetch, so it also
// runs in React Native.
import { maskCEP, onlyDigits } from "./logic";
import type { Address } from "./types";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean | "true";
}

export type CepResult =
  | { ok: true; address: Omit<Address, "number" | "complement"> }
  | { ok: false; reason: "invalid" | "not_found" | "network" };

export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return { ok: false, reason: "invalid" };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
    if (res.status === 400) return { ok: false, reason: "invalid" };
    if (!res.ok) return { ok: false, reason: "network" };
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      address: {
        cep: maskCEP(digits),
        street: data.logradouro,
        // data.complemento describes the CEP's number range ("lado par"),
        // not the resident's unit, so it is not used.
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      },
    };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { ok: false, reason: "network" };
  }
}
