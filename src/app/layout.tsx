import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/auth-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000")
  ),
  title: "Afero",
  description: "Afero — busca e monitoramento de licitações públicas",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Afero",
    title: "Afero",
    description: "Busque e monitore licitações públicas em um só lugar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Afero",
    description: "Busque e monitore licitações públicas em um só lugar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
