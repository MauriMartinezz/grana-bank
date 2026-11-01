import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { parseMovementFilters } from "@/features/movements/filters";
import { MovementFilters } from "@/features/movements/movement-filters";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";
import { MovementResults } from "@/features/movements/movement-results";

export const metadata: Metadata = { title: "Movimientos" };

const LIST_SKELETON_ROWS = 6;

type SearchParams = PageProps<"/movements">["searchParams"];

async function FilteredResults({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseMovementFilters(await searchParams);

  // A new key per search brings the skeleton back while the new data loads.
  return (
    <Suspense
      key={`${filters.type}:${filters.query}`}
      fallback={<MovementListSkeleton rows={LIST_SKELETON_ROWS} />}
    >
      <MovementResults filters={filters} />
    </Suspense>
  );
}

export default function MovementsPage({ searchParams }: PageProps<"/movements">) {
  return (
    <>
      <h1 className="mb-5 font-serif text-2xl font-bold">Movimientos</h1>
      <Suspense fallback={<Skeleton className="h-[100px]" />}>
        <MovementFilters />
      </Suspense>
      <div className="mt-5">
        <Suspense fallback={<MovementListSkeleton rows={LIST_SKELETON_ROWS} />}>
          <FilteredResults searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
