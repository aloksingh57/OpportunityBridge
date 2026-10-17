import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpportunityBridge — Where Opportunity Meets Potential",
    template: "%s · OpportunityBridge",
  },
  description: "Discover opportunities, connect with the right people, and build your future.",
  applicationName: "OpportunityBridge",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "OpportunityBridge",
    description: "Discover opportunities. Connect with the right people. Build your future.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f7f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
