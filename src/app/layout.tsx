import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridBrief TR — Türkiye enerji piyasası operasyon merkezi",
  description:
    "EPİAŞ Şeffaflık 2.0 verileriyle çalışan organizasyon, santral, planlama ve piyasa risk çalışma alanı.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
