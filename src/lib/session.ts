import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

export async function requireRole(role: "hospital" | "patient") {
  const session = await requireSession();
  if (!session || session.user.role !== role) {
    return null;
  }
  return session;
}
