import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { safeText, type SearchParams } from "@/lib/query";

export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = safeText(params.callbackUrl, 300);
  const callbackUrl = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return <AuthShell eyebrow="Your personal matrix" title="Welcome back" description="Sign in to access your watchlist, favorites, and viewing progress."><AuthForm mode="login" callbackUrl={callbackUrl} /></AuthShell>;
}
