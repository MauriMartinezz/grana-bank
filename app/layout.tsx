import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Roboto_Slab } from "next/font/google";
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
      className={`${jakarta.variable} ${robotoSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <div className="mx-auto min-h-dvh w-full max-w-[430px]">{children}</div>
      </body>
    </html>
  );
}
