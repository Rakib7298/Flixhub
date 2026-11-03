import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };
export default function RegisterPage() { return <AuthShell eyebrow="Join MediaMatrix" title="Create your account" description="Build a personal home for every story you want to watch."><AuthForm mode="register" /></AuthShell>; }
