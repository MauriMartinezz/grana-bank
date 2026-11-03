export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-shade/10 motion-safe:animate-pulse ${className}`} />
  );
}
