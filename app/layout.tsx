import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByteQuest — Positive Tech Game",
  description:
    "Treinamento gamificado de cibersegurança por trilha setorial: phishing, smishing e higienização de prompts (DLP).",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
