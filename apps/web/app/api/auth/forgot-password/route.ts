import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import { db } from "@mediamatrix/database";
import { readServerEnv } from "@mediamatrix/config";
import { assertSameOrigin, handleApiError, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { recoverySchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "password-recovery", { limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;
  try {
    assertSameOrigin(request);
    const input = await parseBody(request, recoverySchema);
    const env = readServerEnv();
    if (!env.SMTP_URL || !env.DATABASE_URL || !env.AUTH_SECRET) return NextResponse.json({ error: { code: "RECOVERY_NOT_CONFIGURED", message: "Password recovery email is not configured. Contact the deployment administrator." } }, { status: 503 });
    const user = await db.user.findFirst({ where: { email: input.email, deletedAt: null } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) } });
      const resetUrl = new URL("/reset-password", env.NEXT_PUBLIC_APP_URL);
      resetUrl.searchParams.set("email", input.email);
      resetUrl.searchParams.set("token", token);
      try {
        await createTransport(env.SMTP_URL).sendMail({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Reset your MediaMatrix password",
          text: `A password reset was requested for your MediaMatrix account. Use this link within 30 minutes: ${resetUrl.toString()}\n\nIf you did not request this, ignore this email.`,
          html: `<p>A password reset was requested for your MediaMatrix account.</p><p><a href="${resetUrl.toString()}">Reset your password</a> within 30 minutes.</p><p>If you did not request this, ignore this email.</p>`,
        });
      } catch {
        await db.passwordResetToken.deleteMany({ where: { tokenHash } });
        return NextResponse.json({ error: { code: "DELIVERY_FAILED", message: "Recovery email could not be delivered. Please try again later." } }, { status: 503 });
      }
    }
    return NextResponse.json({ message: "If an active account matches that email, recovery instructions have been requested." }, { status: 202 });
  } catch (error) { return handleApiError(error, request); }
}
