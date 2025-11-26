import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Connectra",
  description: "Connectra connects employers, universities, and students through an intelligent hiring platform. Streamline recruitment, manage talent pipelines, and discover the perfect match between companies and university graduates.",
  icons: {
    icon: "/images/connectra-logo.png",
    shortcut: "/images/connectra-logo.png",
    apple: "/images/connectra-logo.png",
  },
  openGraph: {
    title: "Connectra",
    description: "Connectra connects employers, universities, and students through an intelligent hiring platform. Streamline recruitment, manage talent pipelines, and discover the perfect match between companies and university graduates.",
    images: ["/images/connectra-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
