import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const headlineSerif = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodySerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const detailsInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bangladesh Election Dashboard",
  description: "Interactive dashboard for Bangladesh National Election 2026 results and analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${headlineSerif.variable} ${bodySerif.variable} ${uiMono.variable} ${detailsInter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
