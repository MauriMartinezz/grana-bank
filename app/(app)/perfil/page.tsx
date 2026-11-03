import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoutIcon } from "@/components/icons";
import { logout } from "@/features/auth/actions";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { CURRENCY_LABELS } from "@/features/profile/currency-labels";
import { ProfileAvatar } from "@/features/profile/profile-avatar";
import { SettingRow, SummaryList, SummaryRow } from "@/features/profile/profile-summary";
import { SavedNotice } from "@/features/profile/saved-notice";
import { ThemeToggle } from "@/features/profile/theme-toggle";
import { savedMessage } from "@/features/profile/validation";

export const metadata: Metadata = { title: "Perfil" };

const NOT_SET = "Sin cargar";

type SearchParams = PageProps<"/perfil">["searchParams"];

// Reads the URL, so it renders behind Suspense.
async function Confirmation({ searchParams }: { searchParams: SearchParams }) {
  const { guardado } = await searchParams;
  const message = savedMessage(guardado);
  return message ? <SavedNotice message={message} /> : null;
}

export default async function ProfilePage({ searchParams }: PageProps<"/perfil">) {
  const user = await getCurrentUser();
  const accounts = await listAccounts(user.id);

  return (
    <>
      <h1 className="sr-only">Perfil</h1>
      <header className="flex flex-col items-center gap-3 text-center">
        <ProfileAvatar firstName={user.firstName} lastName={user.lastName} />
        <p className="font-serif text-2xl font-bold">{user.name}</p>
      </header>

      <Suspense fallback={null}>
        <Confirmation searchParams={searchParams} />
      </Suspense>

      <SummaryList>
        <SummaryRow title="Datos personales" href="/perfil/datos" item="datos personales">
          <p>{user.name}</p>
          <p className="font-normal text-muted">Dirección: {user.address ?? NOT_SET}</p>
          <p className="font-normal text-muted">Teléfono: {user.phone ?? NOT_SET}</p>
        </SummaryRow>
        <SummaryRow title="Email" href="/perfil/email" item="email">
          {user.email}
        </SummaryRow>
        {accounts.map((account) => (
          <SummaryRow
            key={account.id}
            title="Alias"
            href={`/perfil/alias/${account.id}`}
            item={`alias en ${account.currency}`}
          >
            {account.currency} · {account.alias}
          </SummaryRow>
        ))}
        <SummaryRow title="Contraseña" href="/perfil/contrasena" item="contraseña">
          <span aria-hidden="true">••••••••</span>
          <span className="sr-only">Oculta</span>
        </SummaryRow>
        <SummaryRow title="Moneda preferida" href="/perfil/moneda" item="moneda preferida">
          {CURRENCY_LABELS[user.preferredCurrency]}
        </SummaryRow>
        <SettingRow title="Tema">
          <ThemeToggle />
        </SettingRow>
      </SummaryList>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-garnet bg-surface px-6 font-serif text-sm text-garnet transition-opacity hover:opacity-90 active:opacity-80"
        >
          <LogoutIcon className="size-5" />
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
