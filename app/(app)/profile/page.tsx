import type { Metadata } from "next";
import type { ReactNode } from "react";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { ProfileAvatar } from "@/features/profile/profile-avatar";
import {
  AliasForm,
  EmailForm,
  PersonalDataForm,
  PreferredCurrencyForm,
} from "@/features/profile/profile-forms";

export const metadata: Metadata = { title: "Perfil" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-6 rounded-2xl bg-white p-5">
      <h2 id={id} className="mb-4 font-serif text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const accounts = await listAccounts(user.id);

  return (
    <>
      <h1 className="sr-only">Perfil</h1>
      <header className="flex flex-col items-center gap-3 text-center">
        <ProfileAvatar firstName={user.firstName} lastName={user.lastName} />
        <div>
          <p className="font-serif text-2xl font-bold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </header>

      <Section title="Datos personales">
        <PersonalDataForm
          initial={{
            firstName: user.firstName,
            lastName: user.lastName,
            address: user.address ?? "",
            phone: user.phone ?? "",
          }}
        />
      </Section>

      <Section title="Email">
        <EmailForm />
      </Section>

      <Section title="Alias">
        <div className="flex flex-col gap-6">
          {accounts.map((account) => (
            <AliasForm
              key={account.id}
              accountId={account.id}
              currency={account.currency}
              alias={account.alias}
            />
          ))}
        </div>
      </Section>

      <Section title="Moneda preferida">
        <PreferredCurrencyForm
          currencies={accounts.map((account) => account.currency)}
          preferred={user.preferredCurrency}
        />
      </Section>
    </>
  );
}
