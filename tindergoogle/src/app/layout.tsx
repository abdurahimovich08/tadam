'use client'

import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect } from "react";
import Script from "next/script";
import { BottomNav } from "@/components/BottomNav";
import { usePathname } from "next/navigation";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { webApp, themeParams, colorScheme } = useTelegram();
  const pathname = usePathname();

  // Pages where bottom nav should be hidden
  const hideNavPages = ['/chat'];
  const showNav = !hideNavPages.some(page => pathname.startsWith(page)) && pathname !== '/';

  useEffect(() => {
    if (webApp) {
      webApp.expand();
      
      // Apply Telegram theme colors to CSS variables
      if (themeParams) {
        const root = document.documentElement;
        if (themeParams.bg_color) root.style.setProperty('--tg-bg', themeParams.bg_color);
        if (themeParams.text_color) root.style.setProperty('--tg-text', themeParams.text_color);
        if (themeParams.hint_color) root.style.setProperty('--tg-hint', themeParams.hint_color);
        if (themeParams.link_color) root.style.setProperty('--tg-link', themeParams.link_color);
        if (themeParams.button_color) root.style.setProperty('--tg-button', themeParams.button_color);
        if (themeParams.button_text_color) root.style.setProperty('--tg-button-text', themeParams.button_text_color);
        if (themeParams.secondary_bg_color) root.style.setProperty('--tg-secondary-bg', themeParams.secondary_bg_color);
      }
    }
  }, [webApp, themeParams]);

  return (
    <html lang="uz" data-theme={colorScheme}>
      <head>
        <title>Tanishuv</title>
        <meta name="description" content="Telegram orqali tanishuv ilovasi" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}>
        <div className="app-shell">
          <main className={showNav ? "pb-20" : ""}>
            {children}
          </main>
          {showNav && <BottomNav />}
        </div>
      </body>
    </html>
  );
}
