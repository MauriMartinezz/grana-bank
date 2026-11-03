function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export function RecipientAvatar({ name, size = "size-11" }: { name: string; size?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-garnet-soft font-serif text-sm font-bold text-garnet`}
    >
      {initials(name)}
    </span>
  );
}
