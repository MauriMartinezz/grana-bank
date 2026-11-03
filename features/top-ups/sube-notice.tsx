/** Shown on the SUBE confirmation and receipt: the load is not usable yet. */
export const SUBE_VALIDATION_NOTICE =
  "Recordá validar la carga en una terminal SUBE o con la app SUBE.";

export function SubeNotice() {
  return (
    <p role="note" className="rounded-2xl bg-yellow-soft p-4 text-sm text-ink">
      {SUBE_VALIDATION_NOTICE}
    </p>
  );
}
