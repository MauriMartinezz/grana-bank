import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { AliasForm } from "@/features/profile/profile-forms";
import { ChangeScreenHeader } from "@/features/profile/profile-summary";
import { getOwnAccount } from "@/features/profile/queries";

export const metadata: Metadata = { title: "Cambiar alias" };

export default async function AliasPage({ params }: PageProps<"/perfil/alias/[cuentaId]">) {
  const { cuentaId: accountId } = await params;
  const user = await getCurrentUser();
  // Another user's account id shows the same screen as one that does not exist.
  const account = await getOwnAccount(user.id, accountId);
  if (!account) notFound();

  return (
    <>
      <ChangeScreenHeader
        title={`Alias en ${account.currency}`}
        description="Con este alias te transfieren a esta cuenta."
      />
      <div className="mt-6">
        <AliasForm accountId={account.id} currency={account.currency} alias={account.alias} />
      </div>
    </>
  );
}
