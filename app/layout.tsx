import type { Metadata, Viewport } from "next";
import LayoutWrapper from "@/components/LayoutWrapper";
import "./globals.css";
import "./gov-platform.css";

export const metadata: Metadata = {
  title: "EMA National LDN Platform — Republic of Zimbabwe",
  description:
    "Official Environmental Management Agency (EMA) national platform for UNCCD SDG Indicator 15.3.1 Land Degradation Neutrality monitoring, verification, and PRAIS 4 reporting.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EMA LDN",
  },
};

export const viewport: Viewport = {
  themeColor: "#004d26",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
