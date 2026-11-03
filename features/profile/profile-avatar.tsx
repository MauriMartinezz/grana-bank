function initials(firstName: string, lastName: string) {
  return [firstName, lastName]
    .map((name) => name.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}

/** The default profile photo: the user's initials in a circle. */
export function ProfileAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <span
      role="img"
      aria-label="Foto de perfil"
      className="flex size-20 shrink-0 items-center justify-center rounded-full bg-garnet-soft font-serif text-2xl font-bold text-garnet"
    >
      <span aria-hidden="true">{initials(firstName, lastName)}</span>
    </span>
  );
}
