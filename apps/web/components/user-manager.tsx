"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@mediamatrix/api-client";
import { Badge, Button, GlassCard } from "@mediamatrix/ui";

interface User { id: string; name: string; username: string; email: string; role: "ADMIN" | "USER"; active: boolean; createdAt: Date }
export function UserManager({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  async function update(id: string, data: { role?: "ADMIN" | "USER"; active?: boolean }) { setBusy(id); setError(""); try { await apiRequest(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "User update failed"); } finally { setBusy(""); } }
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{users.map((user) => <GlassCard key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold">{user.name}</h2><Badge tone={user.role === "ADMIN" ? "yellow" : "neutral"}>{user.role}</Badge>{!user.active && <Badge tone="red">Deactivated</Badge>}</div><p className="mt-1 truncate text-xs text-zinc-500">@{user.username} · {user.email}</p><p className="mt-1 text-[10px] text-zinc-600">Joined {new Date(user.createdAt).toLocaleDateString()}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label={`Role for ${user.username}`} className="field !h-9 !w-auto !py-0 text-xs" value={user.role} disabled={busy === user.id || user.id === currentUserId} onChange={(event) => { const role = event.target.value as "ADMIN" | "USER"; if (window.confirm(`Change ${user.username}'s role to ${role}?`)) void update(user.id, { role }); }}><option value="USER">User</option><option value="ADMIN">Administrator</option></select><Button size="sm" variant="ghost" loading={busy === user.id} disabled={user.id === currentUserId} onClick={() => { if (window.confirm(`${user.active ? "Deactivate" : "Reactivate"} ${user.username}?`)) void update(user.id, { active: !user.active }); }}>{user.active ? "Deactivate" : "Reactivate"}</Button></div></GlassCard>)}</div>;
}
