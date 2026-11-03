"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "next/cache";
import { use, useEffect, useRef, useState, useTransition } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { dateFilterPresets, TYPE_FILTERS } from "./filters";

const SEARCH_DELAY_MS = 300;

/** What the URL holds: `?q=&type=&desde=&hasta=`. Empty values are left out. */
type UrlFilters = {
  q: string;
  type: string | null;
  desde: string;
  hasta: string;
};

function buildHref({ q, type, desde, hasta }: UrlFilters) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const search = params.toString();
  return search ? `/movimientos?${search}` : "/movimientos";
}

const chipClassName = (isActive: boolean) =>
  `flex min-h-11 items-center rounded-full border px-3 text-sm font-medium whitespace-nowrap ${
    isActive ? "border-garnet bg-garnet-soft text-garnet" : "border-transparent text-muted"
  }`;

// Filters live in the URL: they survive a reload and the way back from a
// movement detail, and the server does the filtering.
export function MovementFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlType = searchParams.get("type");
  const urlFrom = searchParams.get("desde") ?? "";
  const urlTo = searchParams.get("hasta") ?? "";

  // The presets end today: read the clock at request time, not in the shell.
  use(io());
  const presets = dateFilterPresets(new Date());
  const today = presets[0].to;

  const [query, setQuery] = useState(urlQuery);
  const [appliedQuery, setAppliedQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // The URL can change without typing, for example with the bottom navigation.
  // While a search is in flight the input is ahead of the URL, so it is kept.
  if (urlQuery !== appliedQuery && !isPending) {
    setAppliedQuery(urlQuery);
    setQuery(urlQuery);
  }

  const current: UrlFilters = { q: query.trim(), type: urlType, desde: urlFrom, hasta: urlTo };

  function navigate(next: Partial<UrlFilters>) {
    const filters = { ...current, ...next };
    clearTimeout(timer.current);
    setAppliedQuery(filters.q);
    startTransition(() => {
      router.replace(buildHref(filters), { scroll: false });
    });
  }

  function applyQuery(value: string) {
    navigate({ q: value.trim() });
  }

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => applyQuery(value), SEARCH_DELAY_MS);
  }

  function handleClear() {
    setQuery("");
    applyQuery("");
  }

  return (
    <>
      <form
        role="search"
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          applyQuery(query);
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre de persona o servicio"
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 w-full rounded-xl border border-line bg-surface pr-11 pl-10 text-sm placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Borrar búsqueda"
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </form>

      <nav
        aria-label="Filtrar por tipo"
        className="-mx-6 mt-5 flex gap-1 overflow-x-auto px-6 [scrollbar-width:none]"
      >
        {TYPE_FILTERS.map(({ value, label }) => {
          const isActive = (urlType ?? null) === value;
          return (
            <Link
              key={label}
              href={buildHref({ ...current, type: value })}
              replace
              scroll={false}
              onClick={(event) => {
                // Navigating here keeps the transition pending, so the input
                // is not reset while the URL catches up.
                event.preventDefault();
                navigate({ type: value });
              }}
              aria-current={isActive ? "true" : undefined}
              className={chipClassName(isActive)}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Filtrar por fecha"
        className="-mx-6 mt-2 flex gap-1 overflow-x-auto px-6 [scrollbar-width:none]"
      >
        {presets.map(({ label, from, to }) => {
          const isActive = urlFrom === from && urlTo === to;
          return (
            <Link
              key={label}
              href={buildHref({ ...current, desde: from, hasta: to })}
              replace
              scroll={false}
              onClick={(event) => {
                event.preventDefault();
                navigate({ desde: from, hasta: to });
              }}
              aria-current={isActive ? "true" : undefined}
              className={chipClassName(isActive)}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <fieldset className="mt-2 flex items-end gap-3">
        <legend className="sr-only">Rango de fechas</legend>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
          Desde
          <input
            type="date"
            name="desde"
            value={urlFrom}
            max={urlTo || today}
            onChange={(event) => navigate({ desde: event.target.value })}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
          Hasta
          <input
            type="date"
            name="hasta"
            value={urlTo}
            min={urlFrom || undefined}
            max={today}
            onChange={(event) => navigate({ hasta: event.target.value })}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"
          />
        </label>
        {(urlFrom || urlTo) && (
          <button
            type="button"
            onClick={() => navigate({ desde: "", hasta: "" })}
            aria-label="Borrar fechas"
            className="flex size-11 shrink-0 items-center justify-center text-muted"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </fieldset>
      {urlFrom && urlTo && urlFrom > urlTo && (
        <p className="mt-2 text-xs text-muted">
          La fecha Desde es posterior a Hasta, así que mostramos todas las fechas.
        </p>
      )}
    </>
  );
}
