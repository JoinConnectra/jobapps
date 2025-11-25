import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "JoinConnectra",
  description: "JoinConnectra - Smart hiring & university talent platform",
  icons: {
    icon: "/images/talentflow-logo.svg",
    shortcut: "/images/talentflow-logo.svg",
    apple: "/images/talentflow-logo.svg",
  },
  openGraph: {
    title: "JoinConnectra",
    description: "JoinConnectra - Smart hiring & university talent platform",
    images: ["/images/talentflow-logo.svg"],
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
      </body>
    </html>
  );
}
