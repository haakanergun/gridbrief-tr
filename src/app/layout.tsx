import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridBrief TR — Agent-native energy market risk workspace",
  description:
    "A source-aware Turkish energy market workspace where people and browser agents investigate risk together.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
