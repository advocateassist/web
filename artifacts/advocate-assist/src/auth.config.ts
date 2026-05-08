import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

// ── Edge-safe config ──────────────────────────────────────────────────────────
// This file is imported by middleware which runs in the Edge Runtime.
// It MUST NOT import bcryptjs, Prisma, or any Node.js-only module — even
// inside a dynamic import — because the Edge bundler traces all imports and
// will attempt to include them in the Edge bundle, crashing at startup.
//
// CredentialsProvider (which needs bcrypt + Prisma) lives in auth.ts only.
// The middleware only verifies the JWT session cookie; it never processes
// sign-ins, so it doesn't need CredentialsProvider at all.
//
// trustHost: true — derives the public URL from the incoming Host header.
// Required in any reverse-proxy environment (Replit, Vercel, etc.) so that
// OAuth callback URLs and CSRF cookie domains resolve to the actual domain.
//
// secret: NextAuth v5 also auto-reads AUTH_SECRET / NEXTAUTH_SECRET from env,
// but setting it explicitly here guarantees both the middleware instance and
// the main auth.ts instance share the same key.
export const authConfig = {
  trustHost: true,
  secret: process.env.SESSION_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
