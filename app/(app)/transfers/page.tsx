import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { ContactList } from "@/features/transfers/contact-list";
import { listContacts } from "@/features/transfers/contacts";

export const metadata: Metadata = { title: "Transferir" };

export default async function TransfersPage() {
  const user = await getCurrentUser();
  const contacts = await listContacts(user.id);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/home" />
        <h1 className="font-serif text-2xl font-bold">Transferir</h1>
      </header>

      <Link
        href="/transfers/new"
        className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-4 font-medium"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-garnet text-white">
          <PlusIcon />
        </span>
        Nuevo destinatario
      </Link>

      <div className="mt-6">
        {contacts.length > 0 ? (
          <ContactList contacts={contacts} />
        ) : (
          <StateMessage
            title="Todavía no tenés contactos"
            description="Cuando le transfieras a alguien por primera vez, lo vas a ver acá."
          />
        )}
      </div>
    </>
  );
}
