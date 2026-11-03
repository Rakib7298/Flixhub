import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/api";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin().catch((error) => { if (error && typeof error === "object" && "status" in error && error.status === 401) return null; throw error; });
  if (!admin) redirect("/login?callbackUrl=/admin");
  if (admin.role !== "ADMIN") redirect("/");
  return <div className="page-container grid gap-6 pb-16 pt-28 sm:pt-32 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8"><aside><div className="mb-4 hidden lg:block"><p className="eyebrow">Control room</p><p className="mt-2 text-xs text-zinc-600">Administrator · {admin.username}</p></div><AdminNav /></aside><div className="min-w-0">{children}</div></div>;
}
