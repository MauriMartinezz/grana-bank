"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateMessage
      role="alert"
      title="No pudimos cargar tus datos"
      description="Revisá tu conexión e intentá de nuevo."
    >
      <Button onClick={() => retry()} className="mt-4">
        Reintentar
      </Button>
    </StateMessage>
  );
}
