"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/components/icons";

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Volver"
      className="-ml-2.5 flex size-11 items-center justify-center rounded-full"
      onClick={() => {
        // A link opened directly has no previous page to go back to.
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      <BackIcon />
    </button>
  );
}
