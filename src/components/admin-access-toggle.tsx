"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { verifyAdminPassword } from "@/app/actions/gate";
import { setAdultVerification } from "@/app/actions/profile";

export default function AdminAccessToggle({
  role,
}: {
  role: string;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [gateState, gateAction, gatePending] = useActionState(
    verifyAdminPassword,
    {}
  );

  function handleLock() {
    startTransition(async () => {
      await setAdultVerification(false);
      setUnlocked(false);
      router.refresh();
    });
  }

  if (role !== "ADMIN") return null;

  if (unlocked) {
    return (
      <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
        <h2 className="text-lg font-semibold tracking-tight">
          🛠️ Painel do administrador
        </h2>
        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
          Acesso liberado nesta sessão do navegador.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/admin"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Abrir painel →
          </a>
          <button
            type="button"
            onClick={handleLock}
            disabled={pending}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145]"
          >
            Bloquear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
      <h2 className="text-lg font-semibold tracking-tight">
        🛠️ Painel do administrador
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Acesso restrito. Digite a senha de administrador para abrir o painel de
        gestão do site.
      </p>
      <form action={gateAction} className="mt-4 max-w-sm space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="adminPassword" className="text-sm font-medium">
            Senha do administrador
          </label>
          <input
            id="adminPassword"
            name="password"
            type="password"
            required
            autoComplete="off"
            placeholder="Senha de 4 dígitos"
            className="rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
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
          className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {gatePending ? "Verificando…" : "Liberar painel"}
        </button>
      </form>
    </div>
  );
}