import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import type React from "react"
import "./globals.css"
import { Providers } from "@/components/providers"
import { PWARegister } from "@/components/pwa-register"
import { PWAInstaller } from "@/components/pwa-installer"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Cursor Agent Manager",
    template: "%s | Cursor Agent Manager",
  },
  description: "Manage your Cursor background agents on the go",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agent Manager",
  },
  icons: {
    icon: [
      { url: "https://example.com/example.png", sizes: "192x192" },
      { url: "https://example.com/example.png", sizes: "512x512" },
    ],
    apple: [
      { url: "https://example.com/example.png", sizes: "180x180" },
    ],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a2e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Agent Manager" />
        <link
          rel="apple-touch-icon"
          href="https://example.com/example.png"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = false;
                  
                  if (!theme || theme === 'system') {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  } else if (theme === 'dark') {
                    isDark = true;
                  }
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // Default to dark if there's an error
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className="antialiased font-sans overflow-hidden md:overflow-visible"
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <PWARegister />
          <PWAInstaller />
        </Providers>
      </body>
    </html>
  )
}
