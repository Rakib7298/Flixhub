import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { HistoryDashboard } from "@/components/history-dashboard";

export const metadata: Metadata = { title: "Watch history" };
export const dynamic = "force-dynamic";
export default async function HistoryPage() { const session = await auth(); if (!session?.user) redirect("/login?callbackUrl=/history"); return <div className="page-container pb-16 pt-28 sm:pt-32"><PageHeader eyebrow="Your viewing activity" title="History & progress" description="Resume an in-progress title or review completed viewing activity stored in your account." /><HistoryDashboard /></div>; }
