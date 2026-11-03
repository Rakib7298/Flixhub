import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { safeText, type SearchParams } from "@/lib/query";

export const metadata: Metadata = { title: "Reset password" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <AuthShell eyebrow="Account recovery" title="Choose a new password" description="Use at least 12 characters. Existing authenticated API sessions will be invalidated."><AuthForm mode="reset" initialEmail={safeText(params.email, 254)} token={safeText(params.token, 64)} /></AuthShell>;
}
