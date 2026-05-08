import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isOnboarded: boolean;
      isLegalPractitioner?: boolean | null;
      personaType?: string | null;
      creditBalance: number;
      language?: string | null;
      state?: string | null;
      city?: string | null;
      termsAccepted: boolean;
      dataConsentAccepted: boolean;
      aiDisclaimerAccepted: boolean;
    };
  }

  interface User {
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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isOnboarded?: boolean;
    isLegalPractitioner?: boolean | null;
    personaType?: string | null;
    creditBalance?: number;
    language?: string | null;
    state?: string | null;
    city?: string | null;
    termsAccepted?: boolean;
    dataConsentAccepted?: boolean;
    aiDisclaimerAccepted?: boolean;
  }
}
