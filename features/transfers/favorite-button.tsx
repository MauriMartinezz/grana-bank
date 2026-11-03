"use client";

import { useOptimistic, useState, useTransition } from "react";
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
  const [failed, setFailed] = useState(false);

  function toggle() {
    const next = !optimistic;
    setFailed(false);
    startTransition(async () => {
      setOptimistic(next);
      const formData = new FormData();
      formData.set("contactUserId", contactUserId);
      formData.set("favorite", String(next));
      // On failure the optimistic star reverts on its own; say why.
      const result = await toggleFavorite(formData).catch(() => ({ ok: false }));
      if (!result.ok) setFailed(true);
    });
  }

  return (
    <>
      {failed && (
        <p role="alert" className="text-xs text-garnet">
          No pudimos actualizar el favorito.
        </p>
      )}
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
    </>
  );
}
