"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { setAdultVerification } from "@/app/actions/profile";
import { verifyAdultPassword } from "@/app/actions/gate";

export default function AdultContentToggle({
  verified,
}: {
  verified: boolean;
}) {
  const [isVerified, setIsVerified] = useState(verified);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const [gateState, gateAction, gatePending] = useActionState(
    verifyAdultPassword,
    {}
  );

  function handleHide() {
    setMessage(null);
    startTransition(async () => {
      const result = await setAdultVerification(false);
      if (!result.ok) {
        setMessage("Não foi possível ocultar o conteúdo adulto.");
        return;
      }
      setIsVerified(false);
      setMessage("Conteúdo 18+ ocultado para esta conta em todo o site.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
      <h2 className="text-lg font-semibold tracking-tight">Conteúdo adulto</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Obras classificadas como 18+ só aparecem para contas liberadas. Essa
        liberação é aplicada no servidor: sem ela, obras 18+ ficam invisíveis
        no catálogo, na busca, na biblioteca e no chat.
      </p>

      {isVerified ? (
        <div className="mt-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Liberado: sua conta enxerga obras 18+ neste navegador.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={handleHide}
            className="mt-3 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-60 dark:border-white/[.145]"
          >
            Ocultar conteúdo 18+
          </button>
        </div>
      ) : (
        <form action={gateAction} className="mt-4 max-w-sm space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="adultPassword" className="text-sm font-medium">
              Senha 18+
            </label>
            <input
              id="adultPassword"
              name="password"
              type="password"
              required
              autoComplete="off"
              placeholder="Digite a senha 18+"
              className="rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Não tem a senha? Peça-a ao administrador.
          </p>
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
            {gatePending ? "Verificando…" : "Liberar conteúdo 18+"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}