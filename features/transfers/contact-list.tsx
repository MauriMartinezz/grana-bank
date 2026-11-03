import Link from "next/link";
import type { Contact } from "./contacts";
import { FavoriteButton } from "./favorite-button";
import { RecipientAvatar } from "./recipient-avatar";

function ContactGroup({ title, contacts }: { title: string; contacts: Contact[] }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm text-muted">{title}</h2>
      <ul className="divide-y divide-line rounded-2xl bg-surface">
        {contacts.map((contact) => (
          <li key={contact.accountId} className="flex items-center gap-1 pr-2">
            <Link
              href={`/transferir/${contact.accountId}`}
              aria-label={`Transferir a ${contact.name}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-4"
            >
              <RecipientAvatar name={contact.name} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{contact.name}</span>
                <span className="block truncate text-sm text-muted">
                  {contact.alias}
                </span>
              </span>
            </Link>
            <FavoriteButton
              contactAccountId={contact.accountId}
              name={contact.name}
              favorite={contact.favorite}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactList({ contacts }: { contacts: Contact[] }) {
  const favorites = contacts.filter((contact) => contact.favorite);
  const others = contacts.filter((contact) => !contact.favorite);

  return (
    <div className="space-y-6">
      {favorites.length > 0 && <ContactGroup title="Favoritos" contacts={favorites} />}
      {others.length > 0 && (
        <ContactGroup
          title={favorites.length > 0 ? "Otros contactos" : "Contactos"}
          contacts={others}
        />
      )}
    </div>
  );
}
