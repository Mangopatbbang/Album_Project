import { NextRequest } from "next/server";
import { validateUser, type AuthedUser } from "@/lib/validateUser";

export async function validateAdmin(req: NextRequest): Promise<AuthedUser | null> {
  const user = await validateUser(req);
  return user?.role === "admin" ? user : null;
}
