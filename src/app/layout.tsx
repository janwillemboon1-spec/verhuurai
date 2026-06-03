import type { Metadata } from "next";
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VerhuurAI — Jouw Airbnb advertentie geoptimaliseerd door Boni",
  description:
    "Upload je advertentie en ontvang binnen 60 seconden een professioneel analyse-rapport met concrete verbeterpunten en herschreven teksten.",
  keywords: "airbnb optimalisatie, advertentie verbeteren, verhuurder tips, boni analyse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-background text-text-primary">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
