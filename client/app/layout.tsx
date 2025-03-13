import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { useThemeStore } from "@/store/themeStore";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/themeProvider";
import { themeScript } from "@/lib/themeScript";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <ThemeProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster />
        </body>
      </ThemeProvider>
    </html>
  );
}
