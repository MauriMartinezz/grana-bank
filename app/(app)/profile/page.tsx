import type { Metadata } from "next";
import { Suspense } from "react";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { CURRENCY_LABELS } from "@/features/profile/currency-labels";
import { ProfileAvatar } from "@/features/profile/profile-avatar";
import { SummaryList, SummaryRow } from "@/features/profile/profile-summary";
import { SavedNotice } from "@/features/profile/saved-notice";
import { savedMessage } from "@/features/profile/validation";

export const metadata: Metadata = { title: "Perfil" };

const NOT_SET = "Sin cargar";

type SearchParams = PageProps<"/profile">["searchParams"];

// Reads the URL, so it renders behind Suspense.
async function Confirmation({ searchParams }: { searchParams: SearchParams }) {
  const { guardado } = await searchParams;
  const message = savedMessage(guardado);
  return message ? <SavedNotice message={message} /> : null;
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
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
        <SummaryRow title="Datos personales" href="/profile/personal" item="datos personales">
          <p>{user.name}</p>
          <p className="font-normal text-muted">Dirección: {user.address ?? NOT_SET}</p>
          <p className="font-normal text-muted">Teléfono: {user.phone ?? NOT_SET}</p>
        </SummaryRow>
        <SummaryRow title="Email" href="/profile/email" item="email">
          {user.email}
        </SummaryRow>
        {accounts.map((account) => (
          <SummaryRow
            key={account.id}
            title="Alias"
            href={`/profile/alias/${account.id}`}
            item={`alias en ${account.currency}`}
          >
            {account.currency} · {account.alias}
          </SummaryRow>
        ))}
        <SummaryRow title="Contraseña" href="/profile/password" item="contraseña">
          <span aria-hidden="true">••••••••</span>
          <span className="sr-only">Oculta</span>
        </SummaryRow>
        <SummaryRow title="Moneda preferida" href="/profile/currency" item="moneda preferida">
          {CURRENCY_LABELS[user.preferredCurrency]}
        </SummaryRow>
      </SummaryList>
    </>
  );
}
