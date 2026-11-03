import type { Recipient } from "./contacts";
import { RecipientAvatar } from "./recipient-avatar";

export function RecipientSummary({ recipient }: { recipient: Recipient }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
      <RecipientAvatar name={recipient.name} />
      <div className="min-w-0">
        <p className="text-xs text-muted">Destinatario</p>
        <p className="truncate font-medium">{recipient.name}</p>
        <p className="truncate text-sm text-muted">Alias: {recipient.alias}</p>
        <p className="truncate text-sm text-muted">{recipient.email}</p>
      </div>
    </div>
  );
}
