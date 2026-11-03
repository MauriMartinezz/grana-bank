import type { ComponentProps } from "react";
import { CardIcon, MastercardLogo } from "@/components/icons";
import { BRAND_NAMES, type CardBrand } from "./validation";

/**
 * A small brand badge, drawn locally: simplified marks, not the official
 * logos. Without a brand it shows a generic card.
 */
export function BrandMark({
  brand,
  className = "",
  ...props
}: { brand: CardBrand | null } & ComponentProps<"span">) {
  const base = `inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-md ${className}`;

  if (brand === "MASTERCARD") {
    return (
      <span className={`${base} bg-ink`} {...props}>
        <MastercardLogo className="h-4 w-6" />
        <span className="sr-only">{BRAND_NAMES.MASTERCARD}</span>
      </span>
    );
  }
  if (brand === "VISA") {
    return (
      <span
        className={`${base} bg-[#2f5d9f] font-serif text-sm font-bold tracking-tight text-white italic`}
        {...props}
      >
        <span aria-hidden="true">VISA</span>
        <span className="sr-only">{BRAND_NAMES.VISA}</span>
      </span>
    );
  }
  if (brand === "AMEX") {
    return (
      <span
        className={`${base} bg-[#1f72cd] text-[10px] font-bold tracking-tight text-white`}
        {...props}
      >
        <span aria-hidden="true">AMEX</span>
        <span className="sr-only">{BRAND_NAMES.AMEX}</span>
      </span>
    );
  }
  return (
    <span className={`${base} border border-line bg-surface text-muted`} {...props}>
      <CardIcon className="size-5" />
    </span>
  );
}
