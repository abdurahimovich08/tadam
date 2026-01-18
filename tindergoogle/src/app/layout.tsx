'use client'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const webApp = useTelegram();

  useEffect(() => {
    if (webApp) {
      webApp.expand();
    }
  }, [webApp]);

  return (
    <html lang="en">
      <head>
        <title>Tinder for Telegram</title>
        <meta name="description" content="Tinder for Telegram" />
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
