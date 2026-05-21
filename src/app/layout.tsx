import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "MemoryFlix — Replay Your Life's Moments",
  description: "A Netflix-style personal memory streaming app where users organize and watch short videos and photos of life memories, structured like a show with seasons and episodes.",
  keywords: ["MemoryFlix", "personal streaming", "memory catalog", "family videos", "photo archives", "life journey", "private video vault"],
  authors: [{ name: "MemoryFlix Team" }],
  creator: "MemoryFlix Inc.",
  icons: {
    icon: "/M_logo.png",
    shortcut: "/M_logo.png",
    apple: "/M_logo.png",
  },
  openGraph: {
    title: "MemoryFlix — Replay Your Life's Moments",
    description: "Structure your personal photos and videos into beautiful seasons and episodes, just like your favorite streaming service. Safe, secure, and private.",
    url: "https://memoryflix.app",
    siteName: "MemoryFlix",
    images: [
      {
        url: "/long_logo.png",
        width: 800,
        height: 600,
        alt: "MemoryFlix Branding Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MemoryFlix — Replay Your Life's Moments",
    description: "Structure your personal photos and videos into beautiful seasons and episodes, just like your favorite streaming service. Safe, secure, and private.",
    images: ["/long_logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#141414] text-white flex flex-col font-sans" suppressHydrationWarning>
        <AuthProvider>
          {children}
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
