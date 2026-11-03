import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      {["h-[380px]", "h-[260px]", "h-[180px]", "h-[220px]"].map((height) => (
        <Skeleton key={height} className={`mt-6 rounded-2xl ${height}`} />
      ))}
    </>
  );
}
