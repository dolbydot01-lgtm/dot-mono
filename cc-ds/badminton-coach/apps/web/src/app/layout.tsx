import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Badminton Coach — Movement Intelligence",
  description:
    "Upload a badminton technique clip and get a pose-driven movement review, annotated video, and exercise plan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="grain">
        <Providers>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
