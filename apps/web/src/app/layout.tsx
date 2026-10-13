import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almost — creative near-miss archaeology",
  description:
    "Consent-based Alexa+/MCP agent that finds what you walked past in a jam and walks you back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
