export default function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-secondary rounded w-2/3" />
            <div className="h-2.5 bg-secondary rounded w-1/3" />
          </div>
          <div className="h-3.5 bg-secondary rounded w-20" />
        </div>
      ))}
    </div>
  );
}
