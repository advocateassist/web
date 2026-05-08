import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Advocate Assist — AI Legal Assistant for India",
    template: "%s | Advocate Assist",
  },
  description:
    "Advocate Assist is an AI-powered Indian legal assistant for lawyers and citizens. Research case law, draft legal documents, and understand your rights under BNS, BNSS, and BSA — instantly.",
  keywords: [
    "Indian legal AI",
    "advocate assistant",
    "legal research India",
    "case law search",
    "legal document drafting",
    "BNS BNSS BSA",
    "Indian lawyer tool",
    "AI legal assistant India",
  ],
  authors: [{ name: "Advocate Assist", url: "https://advocateassist.ai" }],
  creator: "Advocate Assist",
  metadataBase: new URL("https://advocateassist.ai"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://advocateassist.ai",
    siteName: "Advocate Assist",
    title: "Advocate Assist — AI Legal Assistant for India",
    description:
      "Research Indian case law, draft legal documents, understand your rights — all powered by AI. Designed for advocates and citizens.",
    images: [
      {
        url: "/opengraph.jpg",
        width: 1200,
        height: 630,
        alt: "Advocate Assist — AI Legal Assistant for India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Advocate Assist — AI Legal Assistant for India",
    description:
      "Research Indian case law, draft legal documents, understand your rights — powered by AI.",
    images: ["/opengraph.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
