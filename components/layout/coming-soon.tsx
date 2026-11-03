import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";

/** Entry point for a planned feature: shows what is coming, without actions. */
export function ComingSoon({
  title,
  description,
  options = [],
}: {
  title: string;
  /** Without it, the screen shows only the options and no notice. */
  description?: string;
  options?: string[];
}) {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">{title}</h1>
      </header>

      {description && (
        <div className="mt-5">
          <StateMessage title="Próximamente" description={description} />
        </div>
      )}

      {options.length > 0 && (
        <ul aria-label="Opciones disponibles pronto" className="mt-6 space-y-3">
          {options.map((option) => (
            <li
              key={option}
              className="flex items-center justify-between rounded-2xl bg-surface p-4 text-muted"
            >
              <span className="font-medium">{option}</span>
              <span className="rounded-full bg-canvas px-3 py-1 text-xs">
                Próximamente
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
