"use client";

import { useEffect } from "react";

/**
 * The confirmation a change screen leaves on the summary. It drops the
 * `guardado` param from the address bar, so reloading does not show it again.
 */
export function SavedNotice({ message }: { message: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("guardado");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <p role="status" className="mt-6 rounded-2xl bg-garnet-soft px-5 py-3 text-sm font-medium text-garnet">
      {message}
    </p>
  );
}
