import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/back-button";

/** One read-only item of the Perfil summary with the link to the screen that changes it. */
export function SummaryRow({
  title,
  href,
  item,
  children,
}: {
  title: string;
  href: string;
  /** Completes the link's accessible name: "Modificar <item>". */
  item: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{title}</p>
        <div className="mt-0.5 text-sm font-medium break-words">{children}</div>
      </div>
      <Link
        href={href}
        className="flex min-h-11 shrink-0 items-center font-serif text-sm text-garnet"
      >
        Modificar<span className="sr-only"> {item}</span>
      </Link>
    </li>
  );
}

/** One item of the Perfil summary changed right there, without a screen of its own. */
export function SettingRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <p className="text-sm text-muted">{title}</p>
      {children}
    </li>
  );
}

export function SummaryList({ children }: { children: ReactNode }) {
  return <ul className="mt-6 divide-y divide-line rounded-2xl bg-surface px-5">{children}</ul>;
}

/** The header of every change screen, with Back to the summary. */
export function ChangeScreenHeader({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/perfil" />
        <h1 className="font-serif text-2xl font-bold">{title}</h1>
      </header>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </>
  );
}
