import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@mediamatrix/database";
import { requireUser } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { AccountSettings } from "@/components/account-settings";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser().catch((error) => { if (error && typeof error === "object" && "status" in error && error.status === 401) return null; throw error; });
  if (!user) redirect("/login?callbackUrl=/account");
  const preference = await db.userPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Your personal matrix" title="Account settings" description={`Signed in as ${user.email} · @${user.username}`} actions={<SignOutButton />} /><AccountSettings initialName={user.name ?? user.username} preferences={preference} /></div>;
}
