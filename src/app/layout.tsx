import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TooltipObserver from "@/components/TooltipObserver";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infoplazas Analytics - Dashboard Gerencial",
  description: "Plataforma de análisis, control operativo y sincronización para la red de Infoplazas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#030712] text-[#f3f4f6] selection:bg-blue-600/30 selection:text-white">
        <TooltipObserver />
        {children}
      </body>
    </html>
  );
}
