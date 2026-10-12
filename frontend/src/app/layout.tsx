import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/LoginModal";
import { Sidebar } from "@/components/Sidebar";
import { CornerFlightRecorder } from "@/components/CornerFlightRecorder";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AvertCare Clinical Decision Support",
  description: "Prescriptive Clinical Decision Support & Active Ward Triage Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col bg-slate-950 text-slate-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LoginModal />
            <div className="flex flex-col lg:flex-row min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
                {children}
              </div>
            </div>
            <CornerFlightRecorder />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

