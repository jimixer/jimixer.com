import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: {
    default: "jimixer.com",
    template: "%s | jimixer.com",
  },
  description: "jimixer.com",
  keywords: [
    "jimixer",
    "personal website",
    "tech stack",
    "Next.js",
    "AWS",
    "VRChat",
  ],
  authors: [{ name: "jimixer" }],
  creator: "jimixer",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://jimixer.com",
    siteName: "jimixer.com",
    title: "jimixer.com",
    description: "jimixer.com",
    images: [
      {
        url: "/hero/main-avatar.webp",
        width: 1920,
        height: 1080,
        alt: "jimixer.com",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "jimixer.com",
    description: "jimixer.com",
    images: ["/hero/main-avatar.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://jimixer.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
