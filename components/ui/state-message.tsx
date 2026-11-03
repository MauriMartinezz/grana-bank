import type { ReactNode } from "react";

type StateMessageProps = {
  title: string;
  description: string;
  role?: "alert" | "status";
  children?: ReactNode;
};

/** Shared layout of the empty, error and not-found states. */
export function StateMessage({
  title,
  description,
  role = "status",
  children,
}: StateMessageProps) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-10 text-center"
    >
      <p className="font-serif text-lg font-bold">{title}</p>
      <p className="text-sm text-muted">{description}</p>
      {children}
    </div>
  );
}
