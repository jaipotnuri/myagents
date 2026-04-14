import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Ops",
  description: "Job-search operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
