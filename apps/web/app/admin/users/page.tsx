import type { Metadata } from "next";
import { db } from "@mediamatrix/database";
import { requireAdmin } from "@/lib/api";
import { AdminHeader } from "@/components/admin-header";
import { UserManager } from "@/components/user-manager";

export const metadata: Metadata = { title: "Users and roles" };
export const dynamic = "force-dynamic";
export default async function AdminUsersPage() {
  const admin = await requireAdmin(); const users = await db.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" }, take: 300 });
  return <><AdminHeader eyebrow="Role-based access control" title="Users & roles" description="Activate accounts and assign roles with audit logging. Deactivation invalidates Auth.js sessions on their next validation. Self-lockout is blocked." /><UserManager currentUserId={admin.id} users={users.map((user) => ({ id: user.id, name: user.name ?? user.username, username: user.username, email: user.email, role: user.role.name, active: !user.deletedAt, createdAt: user.createdAt }))} /></>;
}
