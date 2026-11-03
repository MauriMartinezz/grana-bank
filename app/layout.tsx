import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Roboto_Slab } from "next/font/google";
import { ThemeSync } from "@/features/profile/theme-toggle";
import { balanceInitScript } from "@/features/account/balance-privacy";
import { themeInitScript } from "@/features/profile/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "GranaBank", template: "%s · GranaBank" },
  description: "Con cada compra, sumás orgullo granate",
};

export const viewport: Viewport = {
  themeColor: "#f1f2f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="light"
      className={`${jakarta.variable} ${robotoSlab.variable} h-full antialiased`}
      // The inline scripts below may switch data-theme and set data-balance
      // before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Applies this device's theme before the first paint, on every page. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Hides the balance before the first paint when this device chose it. */}
        <script dangerouslySetInnerHTML={{ __html: balanceInitScript }} />
      </head>
      <body className="min-h-full font-sans">
        <div className="mx-auto min-h-dvh w-full max-w-[430px]">{children}</div>
        <ThemeSync />
      </body>
    </html>
  );
}
