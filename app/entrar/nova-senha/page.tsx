"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { homeFor } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useFreelas } from "@/lib/store/freelas-store";

const MIN_LENGTH = 8;

/**
 * Where the password reset e-mail lands (Supabase signs the user in from
 * the link). Signed-in users also come here from Perfil to set a password.
 */
export default function NovaSenhaPage() {
  const { state, auth, notify } = useFreelas();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    const short = password.length < MIN_LENGTH;
    const mismatch = !short && confirm !== password;
    setPasswordError(short ? `Use pelo menos ${MIN_LENGTH} caracteres.` : undefined);
    setConfirmError(mismatch ? "As senhas não são iguais." : undefined);
    if (short || mismatch) return;
    setBusy(true);
    try {
      await auth.updatePassword(password);
      notify("Senha salva. Use-a no próximo login.");
      const hasProfile = state.user?.freelancer || state.user?.contratante;
      router.replace(hasProfile ? homeFor(state.mode) : "/entrar");
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh justify-center px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-10 md:items-center">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-10">
          {!auth || !state.user ? (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-extrabold">Link inválido ou expirado</h1>
                <p className="mt-1 text-muted">
                  {auth
                    ? "Peça um novo link em “Esqueci minha senha”. O link vale por pouco tempo e só pode ser usado uma vez."
                    : "Senhas não estão disponíveis na versão de demonstração."}
                </p>
              </div>
              <Link
                href="/entrar"
                className={buttonStyles({ variant: "cta", size: "lg", block: true })}
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <div>
                <Link
                  href="/entrar"
                  className="-ml-2 mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Voltar
                </Link>
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-subtle text-ink">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <h1 className="text-2xl font-extrabold">Crie sua senha</h1>
                <p className="mt-1 text-muted">
                  Para <span className="font-medium text-ink">{state.user.email}</span>. Depois você
                  pode entrar com e-mail e senha.
                </p>
              </div>
              <Field
                label="Nova senha"
                hint={`Pelo menos ${MIN_LENGTH} caracteres.`}
                error={passwordError}
              >
                {(a) => (
                  <PasswordInput
                    {...a}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Confirme a nova senha" error={confirmError}>
                {(a) => (
                  <PasswordInput
                    {...a}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                {busy ? "Salvando…" : "Salvar senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
