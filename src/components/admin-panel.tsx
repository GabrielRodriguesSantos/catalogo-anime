"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import {
  adminCreateUser,
  saveSiteSettings,
  verifyAdminPassword,
} from "@/app/actions/gate";

const inputClass =
  "rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]";
const labelClass = "text-sm font-medium";
const cardClass =
  "rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]";

export default function AdminPanel({
  settings,
}: {
  settings: Record<string, string> | null;
}) {
  const router = useRouter();

  const [gateState, gateAction, gatePending] = useActionState(verifyAdminPassword, {});
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveSiteSettings,
    {}
  );
  const [userState, userAction, userPending] = useActionState(adminCreateUser, {});

  const settingsRef = useRef<HTMLFormElement>(null);
  const userRef = useRef<HTMLFormElement>(null);

  const [preview, setPreview] = useState<null | {
    kind: "settings" | "user";
    summary: string[];
  }>(null);

  function buildSettingsPreview(): string[] {
    const read = (name: string) =>
      String(settingsRef.current?.[name]?.value ?? "");
    return [
      `Senha de acesso: ${read("accessPassword")}`,
      `Senha 18+: ${read("adultPassword")}`,
      `Senha do admin: ${read("adminPassword")}`,
      `Limite de usuários: ${read("maxUsers")}`,
    ];
  }

  function buildUserPreview(): string[] {
    const read = (name: string) =>
      String(userRef.current?.[name]?.value ?? "");
    return [
      `Usuário: ${read("username")}`,
      `E-mail: ${read("email")}`,
      `Senha: ${"•".repeat(Math.min(12, read("password").length))}`,
    ];
  }

  if (!settings) {
    return (
      <div className={cardClass}>
        <h1 className="text-xl font-semibold tracking-tight">
          🛠️ Painel do administrador
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Área restrita aos administradores do site.
        </p>
        <form action={gateAction} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="adminPassword" className={labelClass}>
              Senha do administrador
            </label>
            <input
              id="adminPassword"
              name="password"
              type="password"
              required
              autoComplete="off"
              placeholder="Senha de 4 dígitos"
              className={inputClass}
            />
          </div>
          {gateState?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {gateState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={gatePending}
            className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {gatePending ? "Verificando…" : "Entrar no painel"}
          </button>
          {gateState?.ok && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-sm font-medium text-accent underline"
            >
              Clique aqui para abrir o painel
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        🛠️ Painel do administrador
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Ajustes gerais do site. Antes de aplicar, você confirma em uma janela
        de teste.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <form ref={settingsRef} action={settingsAction} className={cardClass}>
          <h2 className="text-lg font-semibold tracking-tight">Senhas e limites</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="accessPassword" className={labelClass}>
                Senha de acesso ao site
              </label>
              <input
                id="accessPassword"
                name="accessPassword"
                type="text"
                required
                defaultValue={settings.access_password}
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adultPassword" className={labelClass}>
                Senha 18+
              </label>
              <input
                id="adultPassword"
                name="adultPassword"
                type="text"
                required
                defaultValue={settings.adult_password}
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adminPassword" className={labelClass}>
                Senha do administrador
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="text"
                required
                defaultValue={settings.admin_password}
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="maxUsers" className={labelClass}>
                Limite de usuários
              </label>
              <input
                id="maxUsers"
                name="maxUsers"
                type="number"
                min={1}
                max={50}
                required
                defaultValue={settings.max_users}
                className={inputClass}
              />
            </div>
          </div>

          {settingsState?.error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {settingsState.error}
            </p>
          )}
          {settingsState?.ok && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              Senhas e limite atualizados com sucesso.
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={settingsPending}
              onClick={() =>
                setPreview({ kind: "settings", summary: buildSettingsPreview() })
              }
              className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              Salvar alterações
            </button>
          </div>
        </form>

        <form ref={userRef} action={userAction} className={cardClass}>
          <h2 className="text-lg font-semibold tracking-tight">Criar usuário</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            O limite atual é de {settings.max_users} usuários. O novo usuário
            recebe uma senha provisória que você define agora.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newUsername" className={labelClass}>
                Nome de usuário
              </label>
              <input
                id="newUsername"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_\-]+"
                placeholder="ex.: joao"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newEmail" className={labelClass}>
                E-mail
              </label>
              <input
                id="newEmail"
                name="email"
                type="email"
                required
                placeholder="joao@exemplo.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className={labelClass}>
                Senha provisória
              </label>
              <input
                id="newPassword"
                name="password"
                type="text"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="newBio" className={labelClass}>
              Biografia (opcional)
            </label>
            <textarea
              id="newBio"
              name="bio"
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>

          {userState?.error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {userState.error}
            </p>
          )}
          {userState?.ok && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              Usuário criado com sucesso.
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={userPending}
              onClick={() =>
                setPreview({ kind: "user", summary: buildUserPreview() })
              }
              className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
            >
              Criar usuário
            </button>
          </div>
        </form>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-black/[.08] bg-background p-6 dark:border-white/[.145]">
            <h3 className="text-lg font-semibold tracking-tight">
              Confirmar alterações
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Janela de teste: confira cada item antes de aplicar.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {preview.summary.map((line) => (
                <li
                  key={line}
                  className="rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
                >
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  if (preview.kind === "settings") {
                    settingsRef.current?.requestSubmit();
                  } else {
                    userRef.current?.requestSubmit();
                  }
                }}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Confirmar e aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}