"use client";

import { useState, useTransition } from "react";

import { setAdultVerification } from "@/app/actions/profile";

export default function AdultContentToggle({
  verified,
}: {
  verified: boolean;
}) {
  const [isVerified, setIsVerified] = useState(verified);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: boolean) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await setAdultVerification(next);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível atualizar a preferência.");
        return;
      }
      setIsVerified(result.enabled);
      setMessage(
        result.enabled
          ? "Conteúdo 18+ liberado para esta conta. A alteração vale na hora em todo o site."
          : "Conteúdo 18+ ocultado para esta conta em todo o site."
      );
    });
  }

  return (
    <div className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
      <h2 className="text-lg font-semibold tracking-tight">Conteúdo adulto</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Obras classificadas como 18+ só aparecem para contas que confirmam ser
        maiores de 18 anos. Essa liberação é aplicada no servidor: sem ela,
        obras 18+ ficam invisíveis no catálogo, na busca, na biblioteca e no
        chat — para ninguém, sob nenhuma condição.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={isVerified}
          disabled={pending}
          onChange={(event) => handleChange(event.target.checked)}
          aria-label="Confirmar maior de 18"
          className="mt-0.5 h-5 w-5 accent-current"
        />
        <span>
          Confirmo que tenho 18 anos ou mais e quero ver obras classificadas
          como 18+.
        </span>
      </label>
      {message && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}