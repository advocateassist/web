"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be signed in.");

  const g = (k: string) => formData.get(k) as string | null;

  const isLegalPractitioner = g("isLegalPractitioner") === "true";
  const mobileNumber = g("mobileNumber") ?? "";
  const termsAccepted = g("termsAccepted") === "true";
  const wantsWhatsAppUpdates = g("wantsWhatsAppUpdates") === "true";
  const wantsSmsUpdates = g("wantsSmsUpdates") === "true";

  if (!termsAccepted) {
    throw new Error("Please accept the Terms & Conditions to continue.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      isLegalPractitioner,
      personaType: isLegalPractitioner ? "Advocate" : "Consumer",
      mobileNumber: mobileNumber || undefined,
      termsAccepted: true,
      dataConsentAccepted: true,
      aiDisclaimerAccepted: true,
      wantsWhatsAppUpdates,
      wantsSmsUpdates,
      isOnboarded: true,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("aa_onboarded", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  cookieStore.set("aa_persona", isLegalPractitioner ? "Advocate" : "Consumer", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return { success: true };
}
