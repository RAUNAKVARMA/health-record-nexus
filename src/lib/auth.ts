import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    role?: "hospital" | "patient";
    healthId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "hospital" | "patient";
      healthId?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: "hospital" | "patient";
    healthId?: string | null;
  }
}

const credentialsSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  loginType: z.enum(["hospital", "patient"]),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Health ID", type: "text" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Type", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { identifier, password, loginType } = parsed.data;

        const user =
          loginType === "hospital"
            ? await prisma.user.findFirst({
                where: { type: "hospital", email: identifier },
              })
            : await prisma.user.findFirst({
                where: { type: "patient", healthId: identifier },
              });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.type as "hospital" | "patient",
          healthId: user.healthId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.healthId = user.healthId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.healthId = token.healthId ?? null;
      }
      return session;
    },
  },
});
