import type { ComponentProps } from "react";

export const buttonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-garnet px-6 font-serif text-sm text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60";

export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return <button className={`${buttonClassName} ${className}`} {...props} />;
}
