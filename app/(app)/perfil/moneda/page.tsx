import type { Metadata } from "next";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { PreferredCurrencyForm } from "@/features/profile/profile-forms";
import { ChangeScreenHeader } from "@/features/profile/profile-summary";

export const metadata: Metadata = { title: "Moneda preferida" };

export default async function PreferredCurrencyPage() {
  const user = await getCurrentUser();
  const accounts = await listAccounts(user.id);

  return (
    <>
      <ChangeScreenHeader title="Moneda preferida" />
      <div className="mt-6">
        <PreferredCurrencyForm
          currencies={accounts.map((account) => account.currency)}
          preferred={user.preferredCurrency}
        />
      </div>
    </>
  );
}
