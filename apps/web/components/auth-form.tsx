"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@mediamatrix/ui";
import { apiRequest, ApiClientError } from "@mediamatrix/api-client";

export type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthForm({ mode, callbackUrl = "/", initialEmail = "", token = "" }: { mode: AuthMode; callbackUrl?: string; initialEmail?: string; token?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const config = {
    login: { title: "Welcome back", submit: "Sign in" },
    register: { title: "Create your account", submit: "Create account" },
    forgot: { title: "Recover your account", submit: "Send recovery link" },
    reset: { title: "Choose a new password", submit: "Update password" },
  }[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || initialEmail);
    const password = String(form.get("password") || "");
    try {
      if (mode === "login") {
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) throw new Error("Email or password is incorrect, or authentication is not configured.");
        router.push(callbackUrl); router.refresh(); return;
      }
      if (mode === "register") {
        await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, username: form.get("username"), name: form.get("name") || undefined }) });
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) { router.push("/login?registered=1"); return; }
        router.push(callbackUrl); router.refresh(); return;
      }
      if (mode === "forgot") {
        const response = await apiRequest<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
        setSuccess(response.message); return;
      }
      const response = await apiRequest<{ message: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email: initialEmail, token, password }) });
      setSuccess(response.message);
      setTimeout(() => router.push("/login"), 1200);
    } catch (caught) {
      setError(caught instanceof ApiClientError || caught instanceof Error ? caught.message : "The request could not be completed.");
    } finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
    {mode === "register" && <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Display name</span><input name="name" className="field" maxLength={80} autoComplete="name" placeholder="Your name" /></label><label><span className="field-label">Username</span><input name="username" className="field" required minLength={3} maxLength={30} pattern="[a-z0-9_]+" autoComplete="username" placeholder="movie_fan" /></label></div>}
    {mode !== "reset" && <label className="block"><span className="field-label">Email address</span><input name="email" type="email" className="field" required maxLength={254} defaultValue={initialEmail} autoComplete="email" placeholder="you@example.com" /></label>}
    {mode !== "forgot" && <label className="block"><span className="field-label">{mode === "reset" ? "New password" : "Password"}</span><span className="relative block"><input name="password" type={showPassword ? "text" : "password"} className="field pr-12" required minLength={mode === "login" ? 1 : 12} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Your password" : "At least 12 characters"} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
    {mode === "login" && <div className="flex justify-end"><Link href="/forgot-password" className="text-xs font-medium text-zinc-500 hover:text-white">Forgot password?</Link></div>}
    {error && <p role="alert" className="rounded-xl border border-red-500/15 bg-red-500/[.07] px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
    {success && <p role="status" className="flex gap-2 rounded-xl border border-green-500/15 bg-green-500/[.07] px-4 py-3 text-xs leading-5 text-green-200"><CheckCircle2 size={16} className="shrink-0" />{success}</p>}
    <Button type="submit" loading={loading} className="w-full" size="lg">{config.submit}<ArrowRight size={16} /></Button>
    <p className="text-center text-xs text-zinc-500">{mode === "login" ? <>New to MediaMatrix? <Link href="/register" className="font-semibold text-zinc-300 hover:text-white">Create an account</Link></> : mode === "register" ? <>Already have an account? <Link href="/login" className="font-semibold text-zinc-300 hover:text-white">Sign in</Link></> : <Link href="/login" className="font-semibold text-zinc-300 hover:text-white">Back to sign in</Link>}</p>
  </form>;
}
