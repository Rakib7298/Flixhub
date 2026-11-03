"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@mediamatrix/ui";

export function SignOutButton() { return <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={16} />Sign out</Button>; }
