"use client";

import { ArrowLeft, BriefcaseBusiness, ChefHat, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { homeFor } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { ContratanteForm, FreelancerForm } from "@/components/profile-forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ViewMode } from "@/lib/core/types";
import { EmailNotConfirmedError } from "@/lib/store/context";
import { useFreelas } from "@/lib/store/freelas-store";
import { remembersSession, setRememberSession } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Intent = "login" | "signup";
type Step = "email" | "confirm" | "forgot" | "profile";

const MIN_PASSWORD = 8;

const CHOICES: { mode: ViewMode; title: string; text: string; icon: typeof ChefHat }[] = [
  {
    mode: "freelancer",
    title: "Quero trabalhar",
    text: "Encontre turnos e serviços perto de você.",
    icon: ChefHat,
  },
  {
    mode: "contratante",
    title: "Quero contratar",
    text: "Publique vagas e monte sua equipe.",
    icon: BriefcaseBusiness,
  },
];

export default function EntrarPage() {
  const { state, dispatch, backend, auth } = useFreelas();
  const router = useRouter();
  const remote = backend === "supabase";

  const [intent, setIntent] = useState<Intent>("signup");
  const [step, setStep] = useState<Step>("email");
  const [mode, setMode] = useState<ViewMode>("freelancer");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  // The checkbox starts from the last choice made on this device.
  const [remember, setRemember] = useState(remembersSession);
  const [resetSentTo, setResetSentTo] = useState<string>();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const hasProfile = Boolean(state.user?.freelancer || state.user?.contratante);
  // Signed in without a profile (e.g. back from the confirmation e-mail): fill in the data.
  const view: Step = remote && state.user && !hasProfile && step !== "forgot" ? "profile" : step;

  // Anyone who already has a profile goes straight into the app.
  useEffect(() => {
    if (hasProfile) router.replace(homeFor(state.mode));
  }, [hasProfile, state.mode, router]);

  function switchIntent(next: Intent) {
    setIntent(next);
    setStep("email");
    setEmailError(undefined);
    setPasswordError(undefined);
  }

  function validEmail() {
    if (/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError(undefined);
      return true;
    }
    setEmailError("Informe um e-mail válido, como nome@email.com.");
    return false;
  }

  function validPassword() {
    if (intent === "login" ? !password : password.length < MIN_PASSWORD) {
      setPasswordError(
        intent === "login" ? "Digite sua senha." : `Use pelo menos ${MIN_PASSWORD} caracteres.`
      );
      return false;
    }
    setPasswordError(undefined);
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const okEmail = validEmail();
    if (!remote) {
      if (!okEmail) return;
      dispatch({ type: "set_mode", mode });
      dispatch({ type: "sign_up", email: email.trim(), mode });
      setStep("profile");
      return;
    }
    if (!validPassword() || !okEmail || !auth) return;
    dispatch({ type: "set_mode", mode });
    // New accounts stay signed in; on login the checkbox decides.
    setRememberSession(intent === "signup" || remember);
    setBusy(true);
    try {
      if (intent === "login") {
        await auth.signInWithPassword(email.trim(), password);
        // Returning users are sent home by the effect above once their profile loads.
        setStep("profile");
      } else {
        const { needsConfirmation } = await auth.signUp(email.trim(), password);
        setStep(needsConfirmation ? "confirm" : "profile");
        if (needsConfirmation) setResendIn(60);
      }
    } catch (err) {
      if (err instanceof EmailNotConfirmedError) {
        // Never confirmed: send a fresh code and ask for it right here.
        await resendCode();
        setStep("confirm");
      } else {
        setPasswordError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    if (!/^\d{6,10}$/.test(code)) {
      setCodeError("Digite todos os números do código.");
      return;
    }
    setCodeError(undefined);
    setBusy(true);
    try {
      // Signed in once confirmed; the page then moves on to "Seus dados".
      await auth.confirmSignUp(email.trim(), code);
    } catch (err) {
      setCodeError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!auth) return;
    setBusy(true);
    try {
      await auth.resendSignUp(email.trim());
      setResendIn(60);
      setCodeError(undefined);
    } catch (err) {
      setCodeError(`Não foi possível reenviar: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    if (!auth || !validEmail()) return;
    setBusy(true);
    try {
      await auth.sendPasswordReset(email.trim());
      setResetSentTo(email.trim());
    } catch (err) {
      setEmailError(`Não foi possível enviar o link: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function saved() {
    // With Supabase the profile is saved first; the effect above redirects.
    if (remote) setSaving(true);
    else router.replace(homeFor(mode));
  }

  const steps = ["Conta", "Seus dados"];
  const stepIndex = view === "profile" ? 1 : 0;

  const passwordField = remote && (
    <Field
      label="Senha"
      hint={intent === "signup" ? `Pelo menos ${MIN_PASSWORD} caracteres.` : undefined}
      error={passwordError}
    >
      {(a) => (
        <PasswordInput
          {...a}
          autoComplete={intent === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
    </Field>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Hero />

      <section className="flex justify-center px-5 pt-6 pb-10 md:items-center md:px-12 md:py-10">
        <div className="w-full max-w-lg">
          {view === "email" && (
            <div
              role="group"
              aria-label="Entrar ou criar conta"
              className="mb-6 grid grid-cols-2 rounded-xl bg-subtle p-1"
            >
              {(
                [
                  ["login", "Entrar"],
                  ["signup", "Criar conta"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={intent === value}
                  onClick={() => switchIntent(value)}
                  className={cn(
                    "h-10 rounded-lg text-[15px] font-semibold transition-colors",
                    intent === value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {intent === "signup" && view !== "confirm" && (
            <Stepper steps={steps} current={stepIndex} />
          )}

          {view === "email" &&
            (intent === "login" ? (
              <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <div>
                  <h2 className="text-2xl font-extrabold">Bem-vindo de volta</h2>
                  <p className="mt-1 text-muted">
                    {remote
                      ? "Entre com seu e-mail e senha."
                      : "Digite seu e-mail para entrar na demonstração."}
                  </p>
                </div>
                <EmailField value={email} onChange={setEmail} error={emailError} />
                {remote && (
                  <div className="flex flex-col gap-1.5">
                    {passwordField}
                    <button
                      type="button"
                      onClick={() => {
                        setResetSentTo(undefined);
                        setEmailError(undefined);
                        setStep("forgot");
                      }}
                      className="self-end text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
                {remote && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-[18px] accent-cta"
                    />
                    Lembrar de mim neste aparelho
                  </label>
                )}
                <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                  {busy ? "Entrando…" : "Entrar"}
                </Button>
                <p className="text-center text-sm text-muted">
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchIntent("signup")}
                    className="font-semibold text-ink underline underline-offset-4"
                  >
                    Criar conta grátis
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <div>
                  <h2 className="text-2xl font-extrabold">Crie sua conta grátis</h2>
                  <p className="mt-1 text-muted">
                    Escolha por onde começar. O outro perfil você ativa depois, no mesmo login.
                  </p>
                </div>
                <ModeCards value={mode} onChange={setMode} />
                <EmailField value={email} onChange={setEmail} error={emailError} />
                {passwordField}
                <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                  {busy ? "Criando conta…" : "Continuar"}
                </Button>
                <p className="text-center text-sm text-muted">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchIntent("login")}
                    className="font-semibold text-ink underline underline-offset-4"
                  >
                    Entrar
                  </button>
                </p>
                {!remote && (
                  <p className="text-center text-xs text-muted">
                    Versão de demonstração: os dados ficam salvos só neste aparelho.
                  </p>
                )}
              </form>
            ))}

          {view === "confirm" && (
            <form onSubmit={confirmCode} noValidate className="flex flex-col gap-5">
              <div>
                <BackButton
                  label="Usar outro e-mail"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setCodeError(undefined);
                  }}
                />
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-subtle text-ink">
                  <Mail className="size-5" aria-hidden />
                </span>
                <h2 className="text-2xl font-extrabold">Confirme seu e-mail</h2>
                <p className="mt-1 text-muted">
                  Enviamos um código para <span className="font-medium text-ink">{email}</span>.
                  Digite abaixo para ativar a conta. Veja também a caixa de spam.
                </p>
              </div>
              <Field label="Código de confirmação" error={codeError}>
                {(a) => (
                  <Input
                    {...a}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    placeholder="000000"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-14 text-center font-display text-2xl tracking-[0.5em]"
                  />
                )}
              </Field>
              <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                {busy ? "Confirmando…" : "Confirmar e continuar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy || resendIn > 0}
                onClick={() => void resendCode()}
              >
                {resendIn > 0 ? `Reenviar código em ${resendIn}s` : "Reenviar código"}
              </Button>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={sendReset} noValidate className="flex flex-col gap-5">
              <div>
                <BackButton
                  label="Voltar para o login"
                  onClick={() => {
                    setStep("email");
                    setEmailError(undefined);
                  }}
                />
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-subtle text-ink">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <h2 className="text-2xl font-extrabold">Redefinir senha</h2>
                <p className="mt-1 text-muted">
                  {resetSentTo ? (
                    <>
                      Enviamos um link para{" "}
                      <span className="font-medium text-ink">{resetSentTo}</span>. Abra o e-mail
                      neste aparelho e crie a nova senha. Veja também a caixa de spam.
                    </>
                  ) : (
                    "Digite o e-mail da sua conta. Enviamos um link para criar uma nova senha."
                  )}
                </p>
              </div>
              <EmailField value={email} onChange={setEmail} error={emailError} />
              <Button
                type="submit"
                variant={resetSentTo ? "ghost" : "cta"}
                size="lg"
                block
                disabled={busy}
              >
                {busy ? "Enviando…" : resetSentTo ? "Enviar de novo" : "Enviar link"}
              </Button>
            </form>
          )}

          {view === "profile" &&
            (remote && (!state.user || saving) ? (
              <p className="py-16 text-center text-muted" role="status">
                {saving ? "Salvando seu perfil…" : "Entrando…"}
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-extrabold">
                    {intent === "login" ? "Complete seu cadastro" : "Seus dados"}
                  </h2>
                  <p className="mt-1 text-muted">
                    {mode === "freelancer"
                      ? "É o que o contratante vê antes de aprovar você."
                      : "É o que o freelancer vê antes de se candidatar."}
                  </p>
                </div>
                <ModeSwitch value={mode} onChange={setMode} />
                {mode === "freelancer" ? (
                  <FreelancerForm
                    key="freelancer"
                    submitLabel="Criar perfil e ver vagas"
                    onSubmit={(profile) => {
                      dispatch({ type: "set_mode", mode });
                      dispatch({ type: "save_freelancer", profile });
                      saved();
                    }}
                  />
                ) : (
                  <ContratanteForm
                    key="contratante"
                    submitLabel="Criar perfil e publicar vagas"
                    onSubmit={(profile) => {
                      dispatch({ type: "set_mode", mode });
                      dispatch({ type: "save_contratante", profile });
                      saved();
                    }}
                  />
                )}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6 text-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-between md:p-12">
      <div className="flex items-center justify-between">
        <Logo tone="light" />
        <ThemeToggle />
      </div>
      <div className="mt-5 md:mt-0">
        <h1 className="max-w-[14ch] text-[28px] leading-[1.1] font-extrabold tracking-tight md:text-6xl md:leading-[1.05]">
          Seu freela na hora certa.
        </h1>
        <p className="mt-4 hidden max-w-sm text-lg text-slate-300 md:block">
          Restaurantes, eventos, casas e salões encontram profissionais para o turno de hoje, e quem
          trabalha encontra o próximo serviço.
        </p>
      </div>
      <p className="mt-8 hidden text-sm text-slate-400 md:block">
        Um login, dois perfis: trabalhe e contrate com a mesma conta.
      </p>
      {/* Clock-face motif: the shift hours that matter to this market */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-8 -bottom-12 size-32 text-white/[0.06] md:-right-16 md:-bottom-16 md:size-[420px]"
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="8" />
        <path
          d="M100 30v70l46 30"
          fill="none"
          stroke="#FF6B00"
          strokeOpacity=".5"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </section>
  );
}

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Etapas do cadastro">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex flex-1 flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn("h-1 rounded-full", done || active ? "bg-cta" : "bg-line")}
            />
            <span className={cn("text-xs", active ? "font-semibold text-ink" : "text-muted")}>
              {i + 1}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function EmailField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field label="E-mail" error={error}>
      {(a) => (
        <Input
          {...a}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@email.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

function ModeCards({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de perfil" className="grid grid-cols-2 gap-3">
      {CHOICES.map(({ mode, title, text, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border-2 bg-card p-3.5 text-left transition-colors sm:p-4",
              active ? "border-cta" : "border-line hover:border-ink/30"
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                active ? "bg-cta text-navy-deep" : "bg-subtle text-ink"
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="font-display leading-tight font-bold sm:text-lg">{title}</span>
            <span className="text-xs text-muted sm:text-sm">{text}</span>
          </button>
        );
      })}
    </div>
  );
}

function ModeSwitch({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Tipo de perfil"
      className="grid grid-cols-2 rounded-xl bg-subtle p-1"
    >
      {CHOICES.map(({ mode, title }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "h-9 rounded-lg text-sm font-semibold transition-colors",
            value === mode ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {title}
        </button>
      ))}
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}
