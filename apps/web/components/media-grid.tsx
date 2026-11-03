import type { MediaSummary } from "@mediamatrix/shared";
import { EmptyState } from "@mediamatrix/ui";
import { MediaCard } from "./media-card";

export function MediaGrid({ items, emptyTitle = "No titles found", emptyDescription = "Try changing your filters or search for something else." }: { items: MediaSummary[]; emptyTitle?: string; emptyDescription?: string }) {
  if (!items.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <div className="grid grid-cols-2 gap-x-3 gap-y-7 min-[480px]:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{items.map((item, index) => <MediaCard key={`${item.type}-${item.id}`} media={item} compact priority={index < 6} />)}</div>;
}
