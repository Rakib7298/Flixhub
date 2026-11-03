import { compare } from "bcryptjs";
import { db } from "@mediamatrix/database";
import { loginSchema } from "@/lib/validation";

// A constant-time comparison is still performed when the account does not exist.
const DUMMY_PASSWORD_HASH = "$2b$12$VLLp/5.2IYdgqN55olo.ieYfO6A7xFldqDHCFNh5hoFo8/7iJuP4C";

export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success || !process.env.DATABASE_URL) return null;

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true },
  });
  const valid = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid || user.deletedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.username,
    image: user.image,
    role: user.role.name,
    sessionVersion: user.sessionVersion,
  };
}
