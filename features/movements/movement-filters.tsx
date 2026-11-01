"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { TYPE_FILTERS } from "./filters";

const SEARCH_DELAY_MS = 300;

function buildHref(query: string, type: string | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  const search = params.toString();
  return search ? `/movements?${search}` : "/movements";
}

// Filters live in the URL: they survive a reload and the way back from a
// movement detail, and the server does the filtering.
export function MovementFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlType = searchParams.get("type");

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

  function navigate(nextQuery: string, nextType: string | null) {
    clearTimeout(timer.current);
    setAppliedQuery(nextQuery);
    startTransition(() => {
      router.replace(buildHref(nextQuery, nextType), { scroll: false });
    });
  }

  function applyQuery(value: string) {
    navigate(value.trim(), urlType);
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
          className="h-11 w-full rounded-xl border border-line bg-white pr-11 pl-10 text-sm placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
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
              href={buildHref(query.trim(), value)}
              replace
              scroll={false}
              onClick={(event) => {
                // Navigating here keeps the transition pending, so the input
                // is not reset while the URL catches up.
                event.preventDefault();
                navigate(query.trim(), value);
              }}
              aria-current={isActive ? "true" : undefined}
              className={`flex min-h-11 items-center rounded-full border px-3 text-sm font-medium whitespace-nowrap ${
                isActive
                  ? "border-garnet bg-garnet-soft text-garnet"
                  : "border-transparent text-muted"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
