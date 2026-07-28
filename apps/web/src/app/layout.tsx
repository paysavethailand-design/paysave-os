import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/shared/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAYSAVE OS",
  description: "PAYSAVE Recovery operating system",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

/** Provides the root document shell for PAYSAVE OS. */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
