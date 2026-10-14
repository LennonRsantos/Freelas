"use client";

import { ArrowLeft, BriefcaseBusiness, ChefHat, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { homeFor } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { ContratanteForm, FreelancerForm } from "@/components/profile-forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { cn } from "@/lib/utils";

type Intent = "login" | "signup";
type Step = "email" | "code" | "profile";

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
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Anyone who already has a profile goes straight into the app.
  useEffect(() => {
    if (state.user?.freelancer || state.user?.contratante) router.replace(homeFor(state.mode));
  }, [state.user, state.mode, router]);

  function switchIntent(next: Intent) {
    setIntent(next);
    setStep("email");
    setEmailError(undefined);
  }

  async function sendCode() {
    if (!auth) return;
    setBusy(true);
    try {
      await auth.sendCode(email.trim());
      setStep("code");
      setResendIn(60);
    } catch (e) {
      setEmailError(`Não foi possível enviar o código: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError("Informe um e-mail válido, como nome@email.com.");
      return;
    }
    setEmailError(undefined);
    dispatch({ type: "set_mode", mode });
    if (remote) {
      await sendCode();
    } else {
      dispatch({ type: "sign_up", email: email.trim(), mode });
      setStep("profile");
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    if (!/^\d{6,10}$/.test(code)) {
      setCodeError("Digite todos os números do código.");
      return;
    }
    setBusy(true);
    setCodeError(undefined);
    try {
      await auth.verifyCode(email.trim(), code);
      // Returning users are sent home by the effect above once their profile loads.
      setStep("profile");
    } catch (err) {
      setCodeError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saved() {
    // With Supabase the profile is saved first; the effect above redirects.
    if (remote) setSaving(true);
    else router.replace(homeFor(mode));
  }

  const steps = remote ? ["Conta", "Código", "Seus dados"] : ["Conta", "Seus dados"];
  const stepIndex = step === "email" ? 0 : step === "code" ? 1 : steps.length - 1;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Hero />

      <section className="flex justify-center px-5 pt-6 pb-10 md:items-center md:px-12 md:py-10">
        <div className="w-full max-w-lg">
          {step === "email" && (
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
                    intent === value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {intent === "signup" && <Stepper steps={steps} current={stepIndex} />}

          {step === "email" &&
            (intent === "login" ? (
              <form onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
                <div>
                  <h2 className="text-2xl font-extrabold">Bem-vindo de volta</h2>
                  <p className="mt-1 text-muted">
                    {remote
                      ? "Digite seu e-mail. Enviamos um código de acesso, sem senha."
                      : "Digite seu e-mail para entrar na demonstração."}
                  </p>
                </div>
                <EmailField value={email} onChange={setEmail} error={emailError} />
                <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                  {busy ? "Enviando…" : remote ? "Enviar código" : "Entrar"}
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
              <form onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
                <div>
                  <h2 className="text-2xl font-extrabold">Crie sua conta grátis</h2>
                  <p className="mt-1 text-muted">
                    Escolha por onde começar. O outro perfil você ativa depois, no mesmo login.
                  </p>
                </div>
                <ModeCards value={mode} onChange={setMode} />
                <EmailField value={email} onChange={setEmail} error={emailError} />
                <Button type="submit" variant="cta" size="lg" block disabled={busy}>
                  {busy ? "Enviando…" : "Continuar"}
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

          {step === "code" && (
            <form onSubmit={verify} noValidate className="flex flex-col gap-5">
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
                <h2 className="text-2xl font-extrabold">Confira seu e-mail</h2>
                <p className="mt-1 text-muted">
                  Enviamos um código para <span className="font-medium text-ink">{email}</span>.
                  Veja também a caixa de spam.
                </p>
              </div>
              <Field label="Código de acesso" error={codeError}>
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
                {busy ? "Entrando…" : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy || resendIn > 0}
                onClick={() => void sendCode()}
              >
                {resendIn > 0 ? `Reenviar código em ${resendIn}s` : "Reenviar código"}
              </Button>
            </form>
          )}

          {step === "profile" &&
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
              active ? "border-cta" : "border-line hover:border-ink/30",
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                active ? "bg-cta text-navy-deep" : "bg-subtle text-ink",
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
            value === mode ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
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
