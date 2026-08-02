import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ErrorBoundary } from "@/components/layout/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the D3LTA wordmark and HUD section headers. Geist remains
// the body/mono faces; Orbitron only drives --font-display.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "d3lta",
  description: "d3lta — dynamic dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                  <Header />
                  <main className="flex-1 p-6">{children}</main>
                </div>
              </div>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
