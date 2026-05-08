import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    // JWT strategy is required for CredentialsProvider. Database sessions
    // never create a session row for credentials sign-ins in NextAuth v5,
    // so auth() on server actions always returns null without this.
    strategy: "jwt",
  },
  providers: [
    // Re-export all providers from authConfig plus Credentials (Node-only).
    // CredentialsProvider uses bcrypt + Prisma which are NOT Edge-compatible,
    // so it must live here rather than in auth.config.ts.
    ...authConfig.providers,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Return all fields the jwt() callback needs so the token is fully
        // populated on first sign-in without an extra DB round-trip.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isOnboarded: user.isOnboarded,
          isLegalPractitioner: user.isLegalPractitioner,
          personaType: user.personaType,
          creditBalance: user.creditBalance,
          language: user.language,
          state: user.state,
          city: user.city,
          termsAccepted: user.termsAccepted,
          dataConsentAccepted: user.dataConsentAccepted,
          aiDisclaimerAccepted: user.aiDisclaimerAccepted,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: updateSession }) {
      // First sign-in: persist user fields into the token.
      if (user) {
        token.id = user.id;
        const ext = user as {
          isOnboarded?: boolean | null;
          isLegalPractitioner?: boolean | null;
          personaType?: string | null;
          creditBalance?: number | null;
          language?: string | null;
          state?: string | null;
          city?: string | null;
          termsAccepted?: boolean | null;
          dataConsentAccepted?: boolean | null;
          aiDisclaimerAccepted?: boolean | null;
        };

        // For OAuth sign-ins the PrismaAdapter only returns standard fields
        // (id, name, email, image). Fetch the full user row from the DB so
        // custom fields like isOnboarded are always accurate in the token.
        if (ext.isOnboarded === undefined && user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              isOnboarded: true,
              isLegalPractitioner: true,
              personaType: true,
              creditBalance: true,
              language: true,
              state: true,
              city: true,
              termsAccepted: true,
              dataConsentAccepted: true,
              aiDisclaimerAccepted: true,
            },
          });
          if (dbUser) {
            token.isOnboarded = dbUser.isOnboarded;
            token.isLegalPractitioner = dbUser.isLegalPractitioner;
            token.personaType = dbUser.personaType;
            token.creditBalance = dbUser.creditBalance;
            token.language = dbUser.language ?? "en";
            token.state = dbUser.state;
            token.city = dbUser.city;
            token.termsAccepted = dbUser.termsAccepted;
            token.dataConsentAccepted = dbUser.dataConsentAccepted;
            token.aiDisclaimerAccepted = dbUser.aiDisclaimerAccepted;
          }
        } else {
          token.isOnboarded = ext.isOnboarded ?? false;
          token.isLegalPractitioner = ext.isLegalPractitioner ?? null;
          token.personaType = ext.personaType ?? null;
          token.creditBalance = ext.creditBalance ?? 0;
          token.language = ext.language ?? "en";
          token.state = ext.state ?? null;
          token.city = ext.city ?? null;
          token.termsAccepted = ext.termsAccepted ?? false;
          token.dataConsentAccepted = ext.dataConsentAccepted ?? false;
          token.aiDisclaimerAccepted = ext.aiDisclaimerAccepted ?? false;
        }
      }

      // After onboarding completes the client calls useSession().update() —
      // re-fetch from the DB so the token stays in sync.
      if (trigger === "update" && updateSession?.refreshUser && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            isOnboarded: true,
            isLegalPractitioner: true,
            personaType: true,
            creditBalance: true,
            language: true,
            state: true,
            city: true,
            termsAccepted: true,
            dataConsentAccepted: true,
            aiDisclaimerAccepted: true,
          },
        });
        if (dbUser) {
          token.isOnboarded = dbUser.isOnboarded;
          token.isLegalPractitioner = dbUser.isLegalPractitioner;
          token.personaType = dbUser.personaType;
          token.creditBalance = dbUser.creditBalance;
          token.language = dbUser.language ?? "en";
          token.state = dbUser.state;
          token.city = dbUser.city;
          token.termsAccepted = dbUser.termsAccepted;
          token.dataConsentAccepted = dbUser.dataConsentAccepted;
          token.aiDisclaimerAccepted = dbUser.aiDisclaimerAccepted;
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user && token) {
        Object.assign(session.user, {
          id: token.id as string,
          isOnboarded: (token.isOnboarded as boolean) ?? false,
          isLegalPractitioner: (token.isLegalPractitioner as boolean | null) ?? null,
          personaType: (token.personaType as string | null) ?? null,
          creditBalance: (token.creditBalance as number) ?? 0,
          language: (token.language as string) ?? "en",
          state: (token.state as string | null) ?? null,
          city: (token.city as string | null) ?? null,
          termsAccepted: (token.termsAccepted as boolean) ?? false,
          dataConsentAccepted: (token.dataConsentAccepted as boolean) ?? false,
          aiDisclaimerAccepted: (token.aiDisclaimerAccepted as boolean) ?? false,
        });
      }
      return session;
    },
  },
});
