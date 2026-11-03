export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-black/10 motion-safe:animate-pulse ${className}`} />
  );
}
