import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Password recovery" };
export default function ForgotPasswordPage() { return <AuthShell eyebrow="Account recovery" title="Recover your account" description="Enter your account email. Recovery requires SMTP to be configured by the deployment administrator."><AuthForm mode="forgot" /></AuthShell>; }
