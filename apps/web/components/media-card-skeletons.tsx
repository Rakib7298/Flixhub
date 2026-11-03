import { Skeleton } from "@mediamatrix/ui";

export function MediaCardSkeletons({ count = 6 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-label="Loading titles">{Array.from({ length: count }, (_, index) => <div key={index}><Skeleton className="aspect-[2/3] w-full rounded-2xl" /><Skeleton className="mt-3 h-3 w-3/4" /><Skeleton className="mt-2 h-2 w-1/3" /></div>)}</div>;
}
