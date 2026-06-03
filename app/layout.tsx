import type { Metadata, Viewport } from "next";
import LayoutWrapper from "@/components/LayoutWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zimbabwe LDN - Environmental Intelligence Platform",
  description: "High-fidelity geospatial intelligence platform for Land Degradation Neutrality and Soil Analysis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zim LDN",
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
