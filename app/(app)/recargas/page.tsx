import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "Recargas" };

const OPTIONS = [
  { href: "/recargas/celular", title: "Telefonía", detail: "Personal, Movistar, Claro y Tuenti" },
  { href: "/recargas/directv", title: "Televisión satelital", detail: "DirecTV" },
  { href: "/recargas/sube", title: "Tarjeta de transporte", detail: "SUBE" },
];

export default function TopUpsPage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Recargas</h1>
      </header>

      <ul aria-label="Qué querés recargar" className="mt-6 space-y-3">
        {OPTIONS.map((option) => (
          <li key={option.href}>
            <Link
              href={option.href}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
            >
              <span>
                <span className="block font-medium">{option.title}</span>
                <span className="block text-sm text-muted">{option.detail}</span>
              </span>
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
