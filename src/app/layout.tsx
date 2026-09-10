import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Nomi Numi Shop",
  description: "Application foundation for Nomi Numi Shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
