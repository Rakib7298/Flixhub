import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "USER" | "ADMIN";
    sessionVersion?: number;
  }
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
    sessionVersion?: number;
  }
}
