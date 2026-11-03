"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Currency } from "@/generated/prisma/client";
import { accountParam } from "./selected-account";

/**
 * Segmented control between the user's accounts. The selection lives in the
 * URL (`?cuenta=`), so it survives a reload and the back button.
 */
export function AccountSwitcher({
  currencies,
  selected,
}: {
  currencies: readonly Currency[];
  selected: Currency;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function select(currency: Currency) {
    if (currency === selected) return;
    startTransition(() => {
      router.replace(`${pathname}?cuenta=${accountParam(currency)}`, {
        scroll: false,
      });
    });
  }

  return (
    <div
      role="group"
      aria-label="Elegí la cuenta"
      aria-busy={isPending}
      className="flex rounded-full bg-black/5 p-1"
    >
      {currencies.map((currency) => {
        const isSelected = currency === selected;
        return (
          <button
            key={currency}
            type="button"
            aria-pressed={isSelected}
            onClick={() => select(currency)}
            className={`h-11 flex-1 rounded-full text-sm font-semibold transition-colors ${
              isSelected ? "bg-garnet text-white shadow-sm" : "text-muted"
            }`}
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}
