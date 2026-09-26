import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { APP_DESCRIPTION } from "@/lib/config";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Olá, {user?.username ?? "amigo"}!
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        {APP_DESCRIPTION}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="rounded-full border border-black/[.08] px-4 py-1.5 dark:border-white/[.145]">
          Catálogo de obras
        </span>
        <span className="rounded-full border border-black/[.08] px-4 py-1.5 dark:border-white/[.145]">
          Favoritos e biblioteca
        </span>
        <span className="rounded-full border border-black/[.08] px-4 py-1.5 dark:border-white/[.145]">
          Grupos e chat
        </span>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="mt-6 rounded-full border border-black/[.08] px-5 py-2 text-sm dark:border-white/[.145]"
        >
          Sair
        </button>
      </form>
    </div>
  );
}