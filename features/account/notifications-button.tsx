"use client";

import { useState } from "react";
import { BellIcon } from "@/components/icons";

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-11 items-center justify-center rounded-full"
      >
        <BellIcon />
      </button>
      <div role="status">
        {isOpen && (
          <p className="absolute top-12 right-0 z-10 w-max rounded-xl bg-ink px-4 py-2 text-xs text-surface shadow-lg">
            No tenés notificaciones
          </p>
        )}
      </div>
    </div>
  );
}
