import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photo gallery delivery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#0a0a0a]">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
