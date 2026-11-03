import { Skeleton } from "@mediamatrix/ui";
import { MediaCardSkeletons } from "@/components/media-card-skeletons";

export default function Loading() {
  return <div className="pb-16 pt-24"><Skeleton className="h-[440px] w-full rounded-none sm:h-[560px]" /><div className="page-container mt-10"><Skeleton className="mb-5 h-7 w-56" /><MediaCardSkeletons /></div></div>;
}
