"use client";

import { useOptimistic, useTransition } from "react";
import { StarIcon } from "@/components/icons";
import { toggleFavorite } from "./actions";

export function FavoriteButton({
  contactUserId,
  name,
  favorite,
}: {
  contactUserId: string;
  name: string;
  favorite: boolean;
}) {
  // The star flips at once; the server result replaces it when it arrives.
  const [optimistic, setOptimistic] = useOptimistic(favorite);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const formData = new FormData();
      formData.set("contactUserId", contactUserId);
      formData.set("favorite", String(next));
      await toggleFavorite(formData);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={
        optimistic
          ? `Quitar a ${name} de favoritos`
          : `Agregar a ${name} a favoritos`
      }
      className={`flex size-11 shrink-0 items-center justify-center rounded-full ${optimistic ? "text-yellow" : "text-muted"}`}
    >
      <StarIcon filled={optimistic} />
    </button>
  );
}
